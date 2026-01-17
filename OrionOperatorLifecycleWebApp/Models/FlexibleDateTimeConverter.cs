using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace OrionOperatorLifecycleWebApp.Models
{
    /// <summary>
    /// Custom JSON converter to handle multiple date formats from SQL Server exports and ISO formats
    /// </summary>
    public class FlexibleDateTimeConverter : JsonConverter<DateTime?>
    {
        private static readonly string[] DateFormats = new[]
        {
            "yyyy-MM-dd HH:mm:ss.fff",      // SQL Server format: 2066-03-04 00:00:00.000
            "yyyy-MM-dd HH:mm:ss",           // SQL Server without milliseconds
            "yyyy-MM-ddTHH:mm:ss.fffZ",      // ISO 8601 with Z
            "yyyy-MM-ddTHH:mm:ss.fff",       // ISO 8601 without Z
            "yyyy-MM-ddTHH:mm:ssZ",          // ISO 8601 short with Z
            "yyyy-MM-ddTHH:mm:ss",           // ISO 8601 short
            "yyyy-MM-dd",                    // Date only
        };

        public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
            {
                return null;
            }

            if (reader.TokenType == JsonTokenType.String)
            {
                var dateString = reader.GetString();
                
                if (string.IsNullOrWhiteSpace(dateString))
                {
                    return null;
                }

                // Try parsing with each format
                foreach (var format in DateFormats)
                {
                    if (DateTime.TryParseExact(dateString, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime result))
                    {
                        return result;
                    }
                }

                // Fallback to general parsing
                if (DateTime.TryParse(dateString, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime fallbackResult))
                {
                    return fallbackResult;
                }

                // If all parsing fails, return null instead of throwing
                Console.WriteLine($"⚠️ Warning: Could not parse date string: '{dateString}'");
                return null;
            }

            // If it's not a string or null, return null
            return null;
        }

        public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
        {
            if (value.HasValue)
            {
                // Write in ISO 8601 format for consistency
                writer.WriteStringValue(value.Value.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture));
            }
            else
            {
                writer.WriteNullValue();
            }
        }
    }
}
