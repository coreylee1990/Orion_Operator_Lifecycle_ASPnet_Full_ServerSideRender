using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace OrionOperatorLifecycleWebApp.Models
{
    /// <summary>
    /// Converts string or number to nullable int. Handles database values that come as strings.
    /// </summary>
    public class FlexibleNullableIntConverter : JsonConverter<int?>
    {
        public override int? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            switch (reader.TokenType)
            {
                case JsonTokenType.Null:
                    return null;
                case JsonTokenType.Number:
                    return reader.GetInt32();
                case JsonTokenType.String:
                    var stringValue = reader.GetString()?.Trim();
                    if (string.IsNullOrEmpty(stringValue))
                        return null;
                    if (int.TryParse(stringValue, out int result))
                        return result;
                    return null;
                default:
                    return null;
            }
        }

        public override void Write(Utf8JsonWriter writer, int? value, JsonSerializerOptions options)
        {
            if (value.HasValue)
                writer.WriteNumberValue(value.Value);
            else
                writer.WriteNullValue();
        }
    }

    /// <summary>
    /// Converts string, number, or bool to nullable bool. Handles database bit fields that come as "1" or "0" strings.
    /// </summary>
    public class FlexibleNullableBoolConverter : JsonConverter<bool?>
    {
        public override bool? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            switch (reader.TokenType)
            {
                case JsonTokenType.Null:
                    return null;
                case JsonTokenType.True:
                    return true;
                case JsonTokenType.False:
                    return false;
                case JsonTokenType.Number:
                    return reader.GetInt32() != 0;
                case JsonTokenType.String:
                    var stringValue = reader.GetString()?.Trim();
                    if (string.IsNullOrEmpty(stringValue))
                        return null;
                    // Handle "1", "0", "true", "false"
                    if (stringValue == "1" || stringValue.Equals("true", StringComparison.OrdinalIgnoreCase))
                        return true;
                    if (stringValue == "0" || stringValue.Equals("false", StringComparison.OrdinalIgnoreCase))
                        return false;
                    return null;
                default:
                    return null;
            }
        }

        public override void Write(Utf8JsonWriter writer, bool? value, JsonSerializerOptions options)
        {
            if (value.HasValue)
                writer.WriteBooleanValue(value.Value);
            else
                writer.WriteNullValue();
        }
    }
}
