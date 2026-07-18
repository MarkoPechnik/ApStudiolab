# Security Specification for AP Art Studio

## 1. Data Invariants
- A `ClassRoom` must be created by an `educator`.
- A `Portfolio` entry exists only for a student who is a member of the class.
- `Artworks` can only be added to a portfolio by the student owner of that portfolio.
- `Feedback` can only be created by the teacher of the class associated with the portfolio.
- `User` profiles are private to the user themselves, except for basic metadata needed for class management.
- `Example` portfolios can be viewed by anyone, but they are read-only.

## 2. Dirty Dozen Payloads

### P1: Identity Spoofing (Owner)
```json
{
  "op": "create",
  "path": "/portfolios/class123_victimId",
  "auth": "attackerId",
  "data": { "studentId": "victimId", "classId": "class123" }
}
```
**Expected:** DENIED (attackerId != victimId)

### P2: Privilege Escalation (Role)
```json
{
  "op": "update",
  "path": "/users/attackerId/private/profile",
  "auth": "attackerId",
  "data": { "role": "educator" }
}
```
**Expected:** DENIED (Users cannot change their own roles once set)

### P3: Resource Poisoning (Giant ID)
```json
{
  "op": "create",
  "path": "/classes/REALLY_LONG_ID_THAT_EXCEEDS_SIZE_LIMITS...",
  "auth": "educatorId",
  "data": { ... }
}
```
**Expected:** DENIED (isValidId enforcement)

### P4: Orphaned Record (Class Reference)
```json
{
  "op": "create",
  "path": "/portfolios/nonExistentClass_studentId",
  "auth": "studentId",
  "data": { "classId": "nonExistentClass", "studentId": "studentId" }
}
```
**Expected:** DENIED (exists(/databases/$(database)/documents/classes/nonExistentClass) must be true)

### P5: Outcome Tampering (Feedback as Student)
```json
{
  "op": "create",
  "path": "/portfolios/c1_s1/feedback/f1",
  "auth": "s1",
  "data": { "teacherId": "t1", "text": "I am great!" }
}
```
**Expected:** DENIED (Only teacher of the class can give feedback)

### P6: Update Gap (Shadow Field)
```json
{
  "op": "update",
  "path": "/artworks/art1",
  "auth": "ownerId",
  "data": { "ideas": "new idea", "isVerified": true }
}
```
**Expected:** DENIED (affectedKeys().hasOnly(['ideas', ...]) must block 'isVerified')

### P7: PII Leak (Blanket Read)
```json
{
  "op": "list",
  "path": "/users",
  "auth": "studentId",
  "query": {}
}
```
**Expected:** DENIED (Blanket reads of user profiles are forbidden)

### P8: State Shortcutting (Terminal State)
```json
{
  "op": "update",
  "path": "/artworks/art1",
  "auth": "ownerId",
  "data": { "submittedAt": null }
}
```
**Expected:** DENIED (submittedAt should be immutable or only set once)

### P9: Identity Spoofing (Email)
```json
{
  "op": "create",
  "path": "/users/attackerId",
  "auth": { "uid": "attackerId", "token": { "email": "teacher@school.com", "email_verified": false } },
  "data": { "email": "teacher@school.com" }
}
```
**Expected:** DENIED (email_verified must be true)

### P10: Unauthorized Delete (Class)
```json
{
  "op": "delete",
  "path": "/classes/class123",
  "auth": "studentId"
}
```
**Expected:** DENIED (Only the teacherId owner can delete the class)

### P11: Value Poisoning (Invalid Type)
```json
{
  "op": "update",
  "path": "/portfolios/c1_s1",
  "auth": "s1",
  "data": { "inquiry": ["invalid", "array", "type"] }
}
```
**Expected:** DENIED (inquiry must be string)

### P12: Cross-Tenant Write
```json
{
  "op": "create",
  "path": "/portfolios/classA_studentB",
  "auth": "studentB",
  "data": { "classId": "classA", "studentId": "studentB" }
}
```
**Expected:** DENIED (studentB must be a member of classA to create a portfolio for it)

## 3. Test Runner (Implicitly verified by rules design)
The following rules will implement these checks.
