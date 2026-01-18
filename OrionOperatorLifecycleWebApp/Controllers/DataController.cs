        using Microsoft.AspNetCore.Mvc;
        using System.IO;
        using System.Threading.Tasks;
        using System.Text.Json;
        using OrionOperatorLifecycleWebApp.Services;
        using OrionOperatorLifecycleWebApp.Models;
        using System.Linq;
        using System.Collections.Generic;
        using System;

namespace OrionOperatorLifecycleWebApp.Controllers
{
    [ApiController]
    [Route("api/data")]
    public class DataController : ControllerBase
    {
        private readonly string _appDataPath;
        private readonly IOperatorService _operatorService;
        private readonly ICertificationService _certificationService;
        private readonly IPizzaStatusService _pizzaStatusService;
        private readonly IStatusTypeService _statusTypeService;
        private readonly ICertTypeService _certTypeService;
        private readonly IClientService _clientService;

        public DataController(
            IWebHostEnvironment env,
            IOperatorService operatorService,
            ICertificationService certificationService,
            IPizzaStatusService pizzaStatusService,
            IStatusTypeService statusTypeService,
            ICertTypeService certTypeService,
            IClientService clientService)
        {
            _appDataPath = Path.Combine(env.ContentRootPath, "App_Data");
            _operatorService = operatorService;
            _certificationService = certificationService;
            _pizzaStatusService = pizzaStatusService;
            _statusTypeService = statusTypeService;
            _certTypeService = certTypeService;
            _clientService = clientService;
        }

        [HttpPost("statustypes")]
        public IActionResult SaveStatusTypes([FromBody] JsonElement statusTypesJson)
        {
            try 
            {
                var inputJson = statusTypesJson.GetRawText();
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var statusTypes = JsonSerializer.Deserialize<List<StatusType>>(inputJson, options);
                
                _statusTypeService.SaveAllStatusTypes(statusTypes);
                
                return Ok(new { success = true, message = "Status types saved successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving status types: {ex.Message}");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("certtypes")]
        public IActionResult SaveCertTypes([FromBody] JsonElement certTypesJson)
        {
            try
            {
                var inputJson = certTypesJson.GetRawText();
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var certTypes = JsonSerializer.Deserialize<List<CertType>>(inputJson, options);
                
                _certTypeService.SaveAllCertTypes(certTypes);
                
                return Ok(new { success = true, message = "Cert types saved successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving cert types: {ex.Message}");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("clients")]
        public IActionResult GetClients()
        {
            var data = _clientService.GetAllClients();
            var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { PropertyNamingPolicy = null });
            return Content(json, "application/json");
        }

                [HttpGet("operators")]
                public IActionResult GetOperators()
                {
                    var data = _operatorService.GetAllOperators();
                    // Maintain PascalCase to match original JSON structure expected by JS
                    var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { PropertyNamingPolicy = null });
                    return Content(json, "application/json");
                }

                [HttpGet("certifications")]
                public IActionResult GetCertifications()
                {
                    var data = _certificationService.GetAllCertifications();
                    
                    // Map to legacy property names (PascalCase with ID suffix)
                    var mappedData = data.Select(c => new {
                        ID = c.CertificationId,
                        Cert = c.Cert,
                        isApproved = c.IsApproved,  // JS looks for 'isApproved' (often lowercase 'i' in legacy, but let's check JS)
                        IsDeleted = c.IsDeleted,
                        Division = c.Division,
                        CertTypeID = c.CertTypeId,
                        OperatorID = c.OperatorId,
                        Date = c.Date
                    });

                    var json = JsonSerializer.Serialize(mappedData, new JsonSerializerOptions { PropertyNamingPolicy = null });
                    return Content(json, "application/json");
                }

                [HttpGet("certtypes")]
                public IActionResult GetCertTypes()
                {
                    var data = _certTypeService.GetAllCertTypes();
                    // Custom serialization to match legacy JSON property names if needed, 
                    // or just return as is (and ensure frontend expects "id" not "ID" or handles both).
                    // The legacy JSON has PascalCase properties like "ID", "Certification", "DivisionID".
                    // The Model has "Id", "Certification", "DivisionId".
                    // System.Text.Json defaults to camelCase usually unless configured.
                    // But legacy code might rely on exact casing. 
                    
                    var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = null }; // Use PascalCase from C# properties
                    
                    // But we might need to map manual properties to match legacy exactly:
                    // ID vs Id, DivisionID vs DivisionId.
                    // The simplest way to preserve legacy contract is to map to anonymous object or use JsonPropertyName attributes.
                    // Let's create a dynamic mapping to ensure compatibility.
                    
                    var mappedData = data.Select(c => new {
                        ID = c.Id,
                        Certification = c.Certification,
                        Description = c.Description,
                        DivisionID = c.DivisionId,
                        PizzaStatusID = c.PizzaStatusId,
                        isDeleted = c.IsDeleted,
                        // Add other fields if necessary or critical
                    });

                    var json = JsonSerializer.Serialize(mappedData, jsonOptions);
                    return Content(json, "application/json");
                }

                [HttpGet("pizzastatuses")]
                public IActionResult GetPizzaStatuses()
                {
                    var data = _pizzaStatusService.GetAllPizzaStatuses();
                    var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { PropertyNamingPolicy = null });
                    return Content(json, "application/json");
                }


                [HttpGet("statustypes")]
                public IActionResult GetStatusTypes()
                {
                    var data = _statusTypeService.GetAllStatusTypes();
                    var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { PropertyNamingPolicy = null });
                    return Content(json, "application/json");
                }

                [HttpGet("operators/bystatus")]
                public IActionResult GetOperatorsByStatus([FromQuery] string status, [FromQuery] string division)
                {
                    if (string.IsNullOrEmpty(status) || string.IsNullOrEmpty(division))
                    {
                        return BadRequest(new { error = "Status and division parameters are required" });
                    }

                    var allOperators = _operatorService.GetAllOperators();
                    Console.WriteLine($"[DEBUG] Total operators loaded: {allOperators.Count}");
                    Console.WriteLine($"[DEBUG] Looking for status: '{status}', division: '{division}'");
                    
                    // Debug: show first few operators for verification
                    foreach (var op in allOperators.Take(3))
                    {
                        Console.WriteLine($"[DEBUG] Operator: {op.FirstName} {op.LastName} - StatusName: '{op.StatusName}', DivisionId: '{op.DivisionId}'");
                    }
                    
                    var operators = allOperators
                        .Where(op => {
                            var statusMatch = op.StatusName == status;
                            var divisionMatch = op.DivisionId == division;
                            if (statusMatch && divisionMatch)
                            {
                                Console.WriteLine($"[DEBUG] MATCH: {op.FirstName} {op.LastName}");
                            }
                            return statusMatch && divisionMatch;
                        })
                        .Select(op => new {
                            ID = op.Id,
                            FirstName = op.FirstName,
                            LastName = op.LastName,
                            Email = op.Email,
                            Mobile = op.Mobile,
                            StatusName = op.StatusName,
                            DivisionID = op.DivisionId
                        })
                        .ToList();

                    Console.WriteLine($"[DEBUG] Found {operators.Count} matching operators");

                    return Ok(new { 
                        count = operators.Count, 
                        operators = operators,
                        status = status,
                        division = division
                    });
                }

                [HttpPost("operators/bulkupdatestatus")]
                public IActionResult BulkUpdateOperatorStatus([FromBody] BulkStatusUpdateRequest request)
                {
                    if (request == null || request.OperatorIds == null || request.OperatorIds.Count == 0)
                    {
                        return BadRequest(new { error = "OperatorIds are required" });
                    }

                    if (string.IsNullOrEmpty(request.NewStatusName) || string.IsNullOrEmpty(request.NewStatusId))
                    {
                        return BadRequest(new { error = "NewStatusName and NewStatusId are required" });
                    }

                    try
                    {
                        _operatorService.BulkUpdateOperatorStatus(
                            request.OperatorIds,
                            request.NewStatusName,
                            request.NewStatusId,
                            request.NewOrderId ?? ""
                        );

                        return Ok(new { 
                            success = true, 
                            message = $"{request.OperatorIds.Count} operators updated to status '{request.NewStatusName}'",
                            count = request.OperatorIds.Count
                        });
                    }
                    catch (Exception ex)
                    {
                        return StatusCode(500, new { error = ex.Message });
                    }
                }

                [HttpGet("statustracker")]
                public async Task<IActionResult> GetStatusTracker()
                {
                    var filePath = Path.Combine(_appDataPath, "pay_StatusTracker.json");
                    if (!System.IO.File.Exists(filePath))
                        return NotFound();
                    var json = await System.IO.File.ReadAllTextAsync(filePath);
                    return Content(json, "application/json");
                }

                [HttpGet("certificationaliases")]
                public async Task<IActionResult> GetCertificationAliases()
                {
                    var filePath = Path.Combine(_appDataPath, "certification_aliases.json");
                    if (!System.IO.File.Exists(filePath))
                        return NotFound();
                    var json = await System.IO.File.ReadAllTextAsync(filePath);
                    return Content(json, "application/json");
                }
            }

        public class BulkStatusUpdateRequest
        {
            public List<string> OperatorIds { get; set; }
            public string NewStatusName { get; set; }
            public string NewStatusId { get; set; }
            public string NewOrderId { get; set; }
        }
        }
