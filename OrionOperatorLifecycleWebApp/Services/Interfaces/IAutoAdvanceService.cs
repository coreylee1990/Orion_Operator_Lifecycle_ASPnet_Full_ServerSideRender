using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using OrionOperatorLifecycleWebApp.Models;

namespace OrionOperatorLifecycleWebApp.Services
{
    public interface IAutoAdvanceService
    {
        /// <summary>
        /// Re-evaluates a single operator for auto-advance and, if eligible,
        /// moves them to the next status and returns a summary of the change.
        /// Intended to be called by the main Orion app when a cert is approved/revoked.
        /// </summary>
        Task<AutoAdvanceResult?> AdvanceOperatorIfEligibleAsync(
            string operatorId,
            string? reason = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Bulk recalculation used by admin tools / this Requirements app.
        /// Scans a division (optionally scoped by client) and auto-advances
        /// all eligible operators, returning a summary of what changed.
        /// </summary>
        Task<IReadOnlyList<AutoAdvanceResult>> RecalculateAndAdvanceDivisionAsync(
            string clientId,
            string divisionId,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Computes the next status for an operator using the same
        /// ordering and PizzaStatusId rules as the Requirements editor UI.
        /// This does not change the operator; it only returns the target StatusType.
        /// </summary>
        Task<StatusType?> GetNextStatusForOperatorAsync(string operatorId);
    }

    public sealed class AutoAdvanceResult
    {
        public string OperatorId { get; init; } = string.Empty;
        public string? FromStatusId { get; init; }
        public string? ToStatusId { get; init; }
        public bool Changed { get; init; }
        public string? Reason { get; init; }
    }
}
