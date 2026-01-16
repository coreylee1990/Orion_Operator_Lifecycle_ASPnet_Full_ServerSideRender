        using Microsoft.AspNetCore.Mvc;
        using System.IO;
        using System.Threading.Tasks;
        using System.Text.Json;

namespace OrionOperatorLifecycleWebApp.Controllers
{
    [ApiController]
    [Route("api/data")]
    public class DataController : ControllerBase
    {
        private readonly string _appDataPath;
        public DataController(IWebHostEnvironment env)
        {
            _appDataPath = Path.Combine(env.ContentRootPath, "App_Data");
        }

        [HttpPost("statustypes")]
        public async Task<IActionResult> SaveStatusTypes([FromBody] JsonElement statusTypes)
        {
            try 
            {
                var filePath = Path.Combine(_appDataPath, "pay_StatusTypes.json");
                var json = JsonSerializer.Serialize(statusTypes, new JsonSerializerOptions { WriteIndented = true });
                Console.WriteLine($"Saving {json.Length} chars to {filePath}");
                await System.IO.File.WriteAllTextAsync(filePath, json);
                return Ok(new { success = true, message = "Status types saved successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving status types: {ex.Message}");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

                [HttpPost("certtypes")]
                public async Task<IActionResult> SaveCertTypes([FromBody] JsonElement certTypes)
                {
                    try
                    {
                        var filePath = Path.Combine(_appDataPath, "pay_CertTypes.json");
                        var json = JsonSerializer.Serialize(certTypes, new JsonSerializerOptions { WriteIndented = true });
                        Console.WriteLine($"Saving {json.Length} chars to {filePath}");
                        await System.IO.File.WriteAllTextAsync(filePath, json);
                        return Ok(new { success = true, message = "Cert types saved successfully" });
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error saving cert types: {ex.Message}");
                        return StatusCode(500, new { success = false, message = ex.Message });
                    }
                }

                [HttpGet("operators")]
                public async Task<IActionResult> GetOperators()
                {
                    var filePath = Path.Combine(_appDataPath, "pay_Operators.json");
                    if (!System.IO.File.Exists(filePath))
                        return NotFound();
                    var json = await System.IO.File.ReadAllTextAsync(filePath);
                    return Content(json, "application/json");
                }

                [HttpGet("certifications")]
                public async Task<IActionResult> GetCertifications()
                {
                    var filePath = Path.Combine(_appDataPath, "pay_Certifications.json");
                    if (!System.IO.File.Exists(filePath))
                        return NotFound();
                    var json = await System.IO.File.ReadAllTextAsync(filePath);
                    return Content(json, "application/json");
                }

                [HttpGet("certtypes")]
                public async Task<IActionResult> GetCertTypes()
                {
                    var filePath = Path.Combine(_appDataPath, "pay_CertTypes.json");
                    if (!System.IO.File.Exists(filePath))
                        return NotFound();
                    var json = await System.IO.File.ReadAllTextAsync(filePath);
                    return Content(json, "application/json");
                }

                [HttpGet("pizzastatuses")]
                public async Task<IActionResult> GetPizzaStatuses()
                {
                    var filePath = Path.Combine(_appDataPath, "pay_PizzaStatuses.json");
                    if (!System.IO.File.Exists(filePath))
                        return NotFound();
                    var json = await System.IO.File.ReadAllTextAsync(filePath);
                    return Content(json, "application/json");
                }


                [HttpGet("statustypes")]
                public async Task<IActionResult> GetStatusTypes()
                {
                    var filePath = Path.Combine(_appDataPath, "pay_StatusTypes.json");
                    if (!System.IO.File.Exists(filePath))
                        return NotFound();
                    var json = await System.IO.File.ReadAllTextAsync(filePath);
                    return Content(json, "application/json");
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
        }
