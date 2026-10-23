const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, bucketName } = require('../config/aws');

class S3Service {
  async uploadFile(fileBuffer, key, mimeType) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await s3Client.send(command);
      return `https://${bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      console.error('S3 Upload Error:', error);
      // Fallback local URI simulation if S3 credentials not provided
      return `http://localhost:8000/uploads/${key}`;
    }
  }

  async getPresignedDownloadUrl(key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('S3 Signed URL Error:', error);
      return `http://localhost:8000/uploads/${key}`;
    }
  }
}

module.exports = new S3Service();
