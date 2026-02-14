# Health Check Endpoint

## GET /api/am_i_evil

Health check endpoint to verify the application is running.

### Response (200 OK)

```json
{
  "status": "yes_i_am",
  "message": "Application is running",
  "timestamp": "2025-02-13T23:00:00.000Z"
}
```

### Example

```bash
curl http://localhost:3000/api/am_i_evil
```

### Use Cases

- **Deployment verification**: Check if app deployed successfully
- **Health monitoring**: Used by Render for health checks
- **Load balancer**: Verify instance is ready to serve traffic

### Configuration

In `render.yaml`:

```yaml
healthCheckPath: /api/am_i_evil
```
