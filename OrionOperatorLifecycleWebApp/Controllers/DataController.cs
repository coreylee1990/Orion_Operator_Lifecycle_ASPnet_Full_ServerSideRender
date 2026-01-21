        using Microsoft.AspNetCore.Mvc;
        using System.IO;
        using System.Threading.Tasks;
        using System.Text.Json;
        using OrionOperatorLifecycleWebApp.Services;
        using OrionOperatorLifecycleWebApp.Models;
        using System.Linq;
        using System.Collections.Generic;
        using System;
        using Microsoft.Extensions.Caching.Memory;

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
        private readonly IMemoryCache _cache;
        
        // Cache keys
        private const string CACHE_KEY_STATUSTYPES = "StaticData_StatusTypes";
        private const string CACHE_KEY_PIZZASTATUSES = "StaticData_PizzaStatuses";
        private const string CACHE_KEY_CERTTYPES = "StaticData_CertTypes";
        private const string CACHE_KEY_CLIENTS = "StaticData_Clients";
        private static readonly TimeSpan CACHE_DURATION = TimeSpan.FromMinutes(10);

        public DataController(
            IWebHostEnvironment env,
            IOperatorService operatorService,
            ICertificationService certificationService,
            IPizzaStatusService pizzaStatusService,
            IStatusTypeService statusTypeService,
            ICertTypeService certTypeService,
            IClientService clientService,
            IMemoryCache cache)
        {
            _appDataPath = Path.Combine(env.ContentRootPath, "App_Data");
            _operatorService = operatorService;
            _certificationService = certificationService;
            _pizzaStatusService = pizzaStatusService;
            _statusTypeService = statusTypeService;
            _certTypeService = certTypeService;
            _clientService = clientService;
            _cache = cache;
        }

        // POST: /api/data/statustypes/create - Create a single new status type
        [HttpPost("statustypes/create")]
        public IActionResult CreateStatusType([FromBody] JsonElement statusTypeJson)
        {
            try
            {
                var inputJson = statusTypeJson.GetRawText();
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var newStatusType = JsonSerializer.Deserialize<StatusType>(inputJson, options);
                
                if (newStatusType == null)
                {
                    return BadRequest(new { success = false, message = "Invalid status type data" });
                }

                // Generate ID if not provided
                if (string.IsNullOrEmpty(newStatusType.Id))
                {
                    newStatusType.Id = Guid.NewGuid().ToString().ToUpper();
                }

                // Add to existing status types
                _statusTypeService.AddStatusType(newStatusType);
                
                // Invalidate cache
                _cache.Remove(CACHE_KEY_STATUSTYPES);
                
                return Ok(new { success = true, message = "Status type created successfully", id = newStatusType.Id });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating status type: {ex.Message}");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST: /api/data/pizzastatuses/create - Create a single new pizza status
        [HttpPost("pizzastatuses/create")]
        public IActionResult CreatePizzaStatus([FromBody] JsonElement pizzaStatusJson)
        {
            try
            {
                var inputJson = pizzaStatusJson.GetRawText();
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var newPizzaStatus = JsonSerializer.Deserialize<PizzaStatus>(inputJson, options);
                
                if (newPizzaStatus == null)
                {
                    return BadRequest(new { success = false, message = "Invalid pizza status data" });
                }

                // Generate ID if not provided
                if (string.IsNullOrEmpty(newPizzaStatus.Id))
                {
                    newPizzaStatus.Id = Guid.NewGuid().ToString().ToUpper();
                }

                // Add to existing pizza statuses
                _pizzaStatusService.AddPizzaStatus(newPizzaStatus);
                
                // Invalidate cache
                _cache.Remove(CACHE_KEY_PIZZASTATUSES);
                
                return Ok(new { success = true, message = "Pizza status created successfully", id = newPizzaStatus.Id });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating pizza status: {ex.Message}");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
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
                
                // Invalidate the DataController cache so GET returns fresh data
                _cache.Remove(CACHE_KEY_STATUSTYPES);
                
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
                
                // Invalidate the DataController cache so GET returns fresh data
                _cache.Remove(CACHE_KEY_CERTTYPES);
                
                return Ok(new { success = true, message = "Cert types saved successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving cert types: {ex.Message}");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("pizzastatuses")]
        public IActionResult SavePizzaStatuses([FromBody] JsonElement pizzaStatusesJson)
        {
            try
            {
                var inputJson = pizzaStatusesJson.GetRawText();
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var pizzaStatuses = JsonSerializer.Deserialize<List<PizzaStatus>>(inputJson, options);

                _pizzaStatusService.SaveAllPizzaStatuses(pizzaStatuses ?? new List<PizzaStatus>());

                // Invalidate the DataController cache so GET returns fresh data
                _cache.Remove(CACHE_KEY_PIZZASTATUSES);

                return Ok(new { success = true, message = "Pizza statuses saved successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving pizza statuses: {ex.Message}");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("clients")]
        public IActionResult GetClients()
        {
            // Use cache for static data
            var json = _cache.GetOrCreate(CACHE_KEY_CLIENTS, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CACHE_DURATION;
                var data = _clientService.GetAllClients();
                return JsonSerializer.Serialize(data, new JsonSerializerOptions { PropertyNamingPolicy = null });
            });
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
                public IActionResult GetCertTypes([FromQuery] string? clientId, [FromQuery] string? pizzaStatusIds)
                {
                    // Highest priority: when PizzaStatus IDs are specified, scope cert types
                    // strictly to those statuses. This matches the UI's "visible statuses" set.
                    if (!string.IsNullOrWhiteSpace(pizzaStatusIds))
                    {
                        var ids = pizzaStatusIds
                            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                            .Where(id => !string.IsNullOrWhiteSpace(id))
                            .ToList();

                        if (ids.Count == 0)
                        {
                            var emptyJson = JsonSerializer.Serialize(Array.Empty<object>(), new JsonSerializerOptions { PropertyNamingPolicy = null });
                            return Content(emptyJson, "application/json");
                        }

                        var scopedData = _certTypeService.GetCertTypesForPizzaStatuses(ids);
                        var scopedJsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = null };

                        var mappedScopedData = scopedData.Select(c => new {
                            ID = c.Id,
                            Certification = c.Certification,
                            Description = c.Description,
                            DivisionID = c.DivisionId,
                            PizzaStatusID = c.PizzaStatusId,
                            isDeleted = c.IsDeleted,
                        });

                        var scopedJson = JsonSerializer.Serialize(mappedScopedData, scopedJsonOptions);
                        return Content(scopedJson, "application/json");
                    }

                    // When no clientId is provided, treat cert types as static data and cache.
                    if (string.IsNullOrWhiteSpace(clientId))
                    {
                        var jsonAll = _cache.GetOrCreate(CACHE_KEY_CERTTYPES, entry =>
                        {
                            entry.AbsoluteExpirationRelativeToNow = CACHE_DURATION;
                            var data = _certTypeService.GetAllCertTypes();
                            var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = null };

                            var mappedData = data.Select(c => new {
                                ID = c.Id,
                                Certification = c.Certification,
                                Description = c.Description,
                                DivisionID = c.DivisionId,
                                PizzaStatusID = c.PizzaStatusId,
                                isDeleted = c.IsDeleted,
                            });

                            return JsonSerializer.Serialize(mappedData, jsonOptions);
                        });

                        return Content(jsonAll, "application/json");
                    }

                    // For client-scoped requests, bypass the DataController cache and
                    // rely on the service/repository for efficient filtering.
                    var clientData = _certTypeService.GetCertTypesForClient(clientId);
                    var clientJsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = null };

                    var mappedClientData = clientData.Select(c => new {
                        ID = c.Id,
                        Certification = c.Certification,
                        Description = c.Description,
                        DivisionID = c.DivisionId,
                        PizzaStatusID = c.PizzaStatusId,
                        isDeleted = c.IsDeleted,
                    });

                    var clientJson = JsonSerializer.Serialize(mappedClientData, clientJsonOptions);
                    return Content(clientJson, "application/json");
                }

                [HttpGet("pizzastatuses")]
                public IActionResult GetPizzaStatuses()
                {
                    // Use cache for static data
                    var json = _cache.GetOrCreate(CACHE_KEY_PIZZASTATUSES, entry =>
                    {
                        entry.AbsoluteExpirationRelativeToNow = CACHE_DURATION;
                        var data = _pizzaStatusService.GetAllPizzaStatuses();
                        return JsonSerializer.Serialize(data, new JsonSerializerOptions { PropertyNamingPolicy = null });
                    });
                    return Content(json, "application/json");
                }


                [HttpGet("statustypes")]
                public IActionResult GetStatusTypes()
                {
                    // Use cache for static data
                    var json = _cache.GetOrCreate(CACHE_KEY_STATUSTYPES, entry =>
                    {
                        entry.AbsoluteExpirationRelativeToNow = CACHE_DURATION;
                        var data = _statusTypeService.GetAllStatusTypes();
                        return JsonSerializer.Serialize(data, new JsonSerializerOptions { PropertyNamingPolicy = null });
                    });
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
                    
                    var operators = allOperators
                        .Where(op => {
                            var statusMatch = op.Status == status;
                            var divisionMatch = op.DivisionId == division;
                            return statusMatch && divisionMatch;
                        })
                        .Select(op => new {
                            ID = op.Id,
                            FirstName = op.FirstName,
                            LastName = op.LastName,
                            Email = op.Email,
                            Mobile = op.Mobile,
                            // Keep response field name for compatibility, but source from Status
                            StatusName = op.Status,
                            DivisionID = op.DivisionId
                        })
                        .ToList();

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
