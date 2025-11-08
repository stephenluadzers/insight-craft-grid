# Enterprise Automation Platform - Testing Guide

## Overview
This guide provides step-by-step instructions to test all 5 phases of the platform to ensure everything works correctly before proceeding to Phase 6.

---

## Phase 1: API Foundation Testing

### Test 1: API Key Management
**Location**: Navigate to `/api-keys`

1. **Create API Key**
   - Click "Create API Key"
   - Enter name: "Test Key"
   - Select scopes: workflows:read, workflows:write, workflows:execute
   - Click "Create"
   - ✅ Verify key appears in list with correct prefix `wfapi_`
   - ✅ Copy the key (you'll need it for API testing)

2. **View API Key Details**
   - Click on an API key
   - ✅ Verify you can see usage statistics
   - ✅ Check last used timestamp

3. **Delete API Key**
   - Click delete button on a test key
   - Confirm deletion
   - ✅ Verify key is removed from list

### Test 2: API Documentation
**Location**: Navigate to `/api-docs`

1. **Review Documentation**
   - ✅ Verify all 4 endpoints are documented:
     - GET /workflows
     - POST /workflows
     - POST /execute
     - GET /analytics
   - ✅ Check code examples are displayed
   - ✅ Verify authentication section explains API key usage

### Test 3: API Endpoints (Using cURL or Postman)

**Setup**: Use the API key you created above

1. **Test List Workflows**
```bash
curl -X GET "YOUR_SUPABASE_URL/functions/v1/api-workflows" \
  -H "X-API-Key: YOUR_API_KEY"
```
✅ Should return 200 with workflows list

2. **Test Create Workflow**
```bash
curl -X POST "YOUR_SUPABASE_URL/functions/v1/api-workflows" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Workflow",
    "nodes": [{"id": "1", "type": "trigger", "data": {"label": "Start"}}]
  }'
```
✅ Should return 201 with created workflow

3. **Test Execute Workflow**
```bash
curl -X POST "YOUR_SUPABASE_URL/functions/v1/api-execute" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "WORKFLOW_ID_FROM_ABOVE",
    "input": {"test": "data"}
  }'
```
✅ Should return 200 with execution ID

4. **Test Analytics**
```bash
curl -X GET "YOUR_SUPABASE_URL/functions/v1/api-analytics?timeRange=7d" \
  -H "X-API-Key: YOUR_API_KEY"
```
✅ Should return 200 with analytics data

5. **Test Rate Limiting**
- Make 1001 requests quickly
- ✅ Should receive 429 Too Many Requests after 1000 requests

---

## Phase 2: CLI Tool Testing

### Test 1: CLI Documentation
**Location**: Navigate to `/cli`

1. **Review Documentation**
   - ✅ Verify installation instructions are clear
   - ✅ Check all command examples are present
   - ✅ Verify source code is displayed correctly

2. **Copy CLI Code** (Optional)
   - Copy the package.json and index.ts code
   - Create a local project
   - Install dependencies: `npm install`
   - Test login command: `node src/index.js login YOUR_API_KEY`
   - ✅ Verify credentials are saved

---

## Phase 3: Advanced Analytics Testing

### Test 1: Analytics Dashboard
**Location**: Navigate to `/analytics`

1. **View Overview Cards**
   - ✅ Verify 3 summary cards display:
     - Total Executions
     - Success Rate
     - Total Cost

2. **Performance Tab**
   - Select "Performance" tab
   - ✅ Verify PerformanceMonitor component loads
   - ✅ Check execution time trends display
   - ✅ Verify time range selector works (24h, 7d, 30d)

3. **Executions Tab**
   - Select "Executions" tab
   - ✅ Verify line chart shows success/failed executions
   - ✅ Check legend displays correctly

4. **Health Tab**
   - Select "Health" tab
   - ✅ Verify health score displays
   - ✅ Check breakdown by reliability, efficiency, cost, security
   - ✅ Verify recommendations appear

5. **Business Tab**
   - Select "Business" tab
   - ✅ Verify cost breakdown displays
   - ✅ Check performance insights
   - ✅ Verify time savings calculations

6. **Errors Tab**
   - Select "Errors" tab
   - ✅ Verify error aggregation displays
   - ✅ Check error statistics
   - ✅ Test "Resolve" button functionality

7. **Security Tab**
   - Select "Security" tab
   - ✅ Verify security monitoring dashboard loads
   - ✅ Check security scans display
   - ✅ Verify suspicious activity logs

---

## Phase 4: Webhooks Integration Testing

### Test 1: Webhook Management
**Location**: Navigate to `/webhooks`

1. **Create Webhook**
   - Click "Create Webhook"
   - Select a workflow
   - ✅ Verify webhook is created with unique key
   - ✅ Copy webhook URL

2. **View Webhook Details**
   - Click "Settings" button on a webhook
   - ✅ Verify webhook configuration displays
   - ✅ Check webhook URL and key are shown

3. **Configure Event Subscriptions**
   - In webhook details, go to "Event Subscriptions" tab
   - Select events:
     - workflow.started
     - workflow.completed
     - workflow.failed
   - Click "Save Changes"
   - ✅ Verify subscriptions are saved

4. **Test Webhook Trigger**
```bash
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```
✅ Should receive success response

5. **View Delivery Logs**
   - In webhook details, go to "Delivery Logs" tab
   - ✅ Verify delivery log appears
   - ✅ Check status (success/failed)
   - ✅ Verify response body displays

6. **Delete Webhook**
   - Click delete button
   - Confirm deletion
   - ✅ Verify webhook is removed

---

## Phase 5: Version Control Testing

### Test 1: Create Versions
**Location**: Navigate to `/versions`

1. **Create Initial Version**
   - Click "Create Version"
   - Enter name: "Initial Release"
   - Enter description: "First stable version"
   - Add change summary: "Base workflow implementation"
   - Add tags: "stable", "v1.0"
   - Click "Create Version"
   - ✅ Verify version appears in history as v1

2. **Create Second Version**
   - Click "Create Version" again
   - Enter name: "Feature Update"
   - Enter description: "Added new nodes"
   - Add change summary: "Added email notification and webhook trigger"
   - Add tags: "feature"
   - Click "Create Version"
   - ✅ Verify version appears as v2
   - ✅ Check "Current" badge displays on v2

### Test 2: Version History
**Location**: Stay on `/versions`

1. **View Version List**
   - ✅ Verify versions are listed in descending order (newest first)
   - ✅ Check each version shows:
     - Version number
     - Name
     - Description
     - Change summary
     - Tags
     - Created timestamp
     - Current badge (on latest)

2. **View Version Details**
   - Click on a version
   - ✅ Verify version metadata displays
   - ✅ Check tags are shown

### Test 3: Compare Versions (Diff)
**Location**: Stay on `/versions`

1. **Start Comparison**
   - Click "View Diff" on v1 (Initial Release)
   - ✅ Verify "Comparison Mode" banner appears

2. **Complete Comparison**
   - Click "View Diff" on v2 (Feature Update)
   - ✅ Verify diff visualization appears on right side
   - ✅ Check summary cards show:
     - Added Nodes count
     - Removed Nodes count
     - Modified Nodes count

3. **View Diff Details**
   - Click "Added" tab
   - ✅ Verify added nodes display with green highlighting
   - Click "Removed" tab
   - ✅ Verify removed nodes display with red highlighting
   - Click "Modified" tab
   - ✅ Verify modified nodes show before/after comparison

4. **Clear Comparison**
   - Click "Clear Comparison"
   - ✅ Verify diff view closes

### Test 4: Rollback Testing
**Location**: Stay on `/versions`

1. **Perform Rollback**
   - On v1 (not current), click "Rollback to this version"
   - Read confirmation dialog
   - Click "Confirm Rollback"
   - ✅ Verify success toast appears
   - ✅ Check "Current" badge moves to v1
   - ✅ Verify workflow is updated

2. **Verify Rollback**
   - Navigate back to main workflow page
   - ✅ Verify workflow reflects v1 state
   - ✅ Check nodes match v1 configuration

3. **Create Version After Rollback**
   - Navigate back to `/versions`
   - Create new version: "Reverted to v1"
   - ✅ Verify new version is created as v3
   - ✅ Check version history maintains continuity

---

## Integration Testing

### Test 1: Cross-Feature Workflow

1. **Complete Workflow**
   - Create a workflow via UI
   - Create a version of it
   - Execute it via API
   - View execution in Analytics
   - Create webhook for it
   - Trigger webhook
   - View webhook delivery logs
   - Rollback to previous version
   - Execute via API again
   - Verify analytics updates

2. **Verification Checklist**
   - ✅ Workflow CRUD operations work
   - ✅ Version creation succeeds
   - ✅ API execution works
   - ✅ Analytics track executions
   - ✅ Webhook triggers successfully
   - ✅ Delivery logs appear
   - ✅ Rollback functions correctly
   - ✅ All data remains consistent

---

## Performance Testing

### Test 1: Load Testing
1. **API Performance**
   - Make 100 rapid API requests
   - ✅ Verify all succeed (or fail gracefully with rate limiting)
   - ✅ Check response times are reasonable (<1s)

2. **Analytics Performance**
   - Load analytics page with large dataset
   - ✅ Verify charts render smoothly
   - ✅ Check tab switching is responsive

3. **Version History Performance**
   - Create 20+ versions
   - ✅ Verify list loads quickly
   - ✅ Check scrolling is smooth
   - ✅ Verify diff calculation is fast

---

## Security Testing

### Test 1: Authentication
1. **API Without Key**
```bash
curl -X GET "YOUR_SUPABASE_URL/functions/v1/api-workflows"
```
✅ Should return 401 Unauthorized

2. **Invalid API Key**
```bash
curl -X GET "YOUR_SUPABASE_URL/functions/v1/api-workflows" \
  -H "X-API-Key: invalid_key"
```
✅ Should return 401 Unauthorized

3. **Expired/Inactive Key**
   - Deactivate an API key
   - Try to use it
   - ✅ Should return 401 Unauthorized

### Test 2: Authorization
1. **Access Control**
   - Try to access another workspace's data
   - ✅ Should be blocked by RLS policies

2. **Webhook Security**
   - Try invalid webhook keys
   - ✅ Should return 404 or 401

### Test 3: Input Validation
1. **Malicious Payloads**
   - Try SQL injection in workflow name: `'; DROP TABLE workflows; --`
   - ✅ Should be sanitized/rejected
   - Try XSS in description: `<script>alert('xss')</script>`
   - ✅ Should be escaped/sanitized

---

## Error Handling Testing

### Test 1: Network Errors
1. **Offline Testing**
   - Disconnect internet
   - Try to load pages
   - ✅ Verify appropriate error messages display

2. **API Errors**
   - Send malformed JSON
   - ✅ Verify 400 Bad Request with clear error message

### Test 2: Edge Cases
1. **Empty States**
   - Delete all workflows
   - ✅ Verify empty state displays correctly
   - Delete all versions
   - ✅ Verify empty state displays correctly

2. **Large Data**
   - Create workflow with 100+ nodes
   - ✅ Verify version system handles it
   - ✅ Check diff calculation completes

---

## Final Checklist

Before proceeding to Phase 6, ensure ALL items are checked:

### Phase 1 - API Foundation
- [ ] API keys can be created, viewed, and deleted
- [ ] API documentation is complete and accurate
- [ ] All 4 API endpoints work correctly
- [ ] Rate limiting functions as expected
- [ ] Authentication/authorization is secure

### Phase 2 - CLI Tool
- [ ] Documentation is clear and complete
- [ ] Code examples are correct
- [ ] Installation instructions work

### Phase 3 - Advanced Analytics
- [ ] All 6 tabs load and display data correctly
- [ ] Charts and visualizations render properly
- [ ] Time range selectors work
- [ ] Real-time updates function (if enabled)

### Phase 4 - Webhooks
- [ ] Webhooks can be created and deleted
- [ ] Event subscriptions work correctly
- [ ] Webhook triggers function properly
- [ ] Delivery logs display accurately
- [ ] Webhook details/configuration accessible

### Phase 5 - Version Control
- [ ] Versions can be created with all metadata
- [ ] Version history displays correctly
- [ ] Diff visualization shows changes accurately
- [ ] Rollback functionality works
- [ ] Version tags and descriptions persist

### Integration
- [ ] All features work together cohesively
- [ ] Data flows correctly between features
- [ ] No breaking interactions between phases

### Security
- [ ] Authentication required where needed
- [ ] Authorization properly enforced
- [ ] Input validation prevents injection attacks
- [ ] Sensitive data properly protected

### Performance
- [ ] Pages load in reasonable time (<3s)
- [ ] No memory leaks or performance degradation
- [ ] Rate limiting prevents abuse

---

## Troubleshooting

If you encounter issues during testing:

1. **Check Console Logs**
   - Open browser DevTools (F12)
   - Look for errors in Console tab
   - Check Network tab for failed requests

2. **Check Edge Function Logs**
   - Navigate to Cloud tab
   - View Edge Functions logs
   - Look for error messages

3. **Verify Database State**
   - Check that tables exist and have data
   - Verify RLS policies are correct
   - Ensure functions are deployed

4. **Common Issues**
   - **404 Errors**: Edge function not deployed
   - **401 Errors**: Authentication issue
   - **500 Errors**: Check edge function logs
   - **Blank Pages**: Check console for React errors

---

## Ready for Phase 6?

Once you've completed all tests and verified everything works:
✅ All checkboxes above are checked
✅ No critical bugs remain
✅ Performance is acceptable
✅ Security tests passed

**You're ready to proceed to Phase 6: Real-time Collaboration!**
