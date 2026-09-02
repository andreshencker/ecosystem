## **Purpose**

A task is not considered complete until both implementation and project documentation are updated.

---

## **Mandatory Completion Checklist**

### **Code**

- Feature implemented
- Build passes successfully
- Tests pass successfully
- Acceptance criteria verified
- No known regressions introduced

---

### **Documentation**

The following documents must be updated when applicable:

- Sprint document
- Backlog
- Technical Debt
- Decision Records
- Architecture documentation
- API documentation
- Database documentation
- Security documentation

---

### **Traceability**

Every implementation must preserve full traceability.

Audit  
→ Decision  
→ Technical Debt  
→ Backlog  
→ Sprint  
→ Implementation

Every artifact must reference the previous artifact that generated it.

Examples:

- Technical Debt references Audit
- Sprint references Technical Debt
- Implementation references Sprint
- Resolved Debt references Sprint and Implementation

---

## **Technical Debt Rules**

Open technical debt must be stored in:

Technical Debt/Open/

Resolved technical debt must be moved to:

Technical Debt/Resolved/

When resolving technical debt:

- Record resolution date
- Record sprint responsible
- Record implementation reference
- Record verification evidence

Example:

Technical Debt/Open/TD-007.md

↓

Technical Debt/Resolved/TD-007.md

---

## **Sprint Rules**

Each sprint item must contain:

### **Metadata**

- ID
- Description
- Priority
- Status
- Effort
- Dependencies
- Related Technical Debt
- Related Decision

### **Status Values**

- Not Started
- In Progress
- Blocked
- Completed

### **Completion Information**

- Completion Date
- Developer
- Files Modified
- Build Result
- Test Result
- Validation Result

---

## **Decision Record Rules**

Every architectural or business decision must have its own file.

Structure:

Decisions/

DEC-001.md  
DEC-002.md  
DEC-003.md

Each decision must contain:

- Context
- Options Evaluated
- Decision
- Rationale
- Consequences
- Related Technical Debt
- Related Sprint

---

## **Audit Rules**

Audit files are immutable historical records.

Location:

Audits/

Rules:

- Never edit an audit after creation
- Never delete an audit
- Create new audits for reassessment
- Link audits to generated decisions and technical debt

---

## **Validation Rules**

Before marking any task as completed:

### **Build Validation**

- Build must succeed
- No compilation errors

### **Functional Validation**

- Acceptance criteria met
- Feature manually tested

### **Test Validation**

- Existing tests pass
- New tests added when required

### **Documentation Validation**

- Sprint updated
- Technical debt updated
- Decision records updated
- Architecture updated if needed

---

## **Definition of Done**

A task is COMPLETE only when ALL of the following are true:

- Code implemented
- Build successful
- Tests successful
- Acceptance criteria verified
- Sprint updated
- Technical debt updated
- Decision records updated (if applicable)
- Architecture updated (if applicable)
- Traceability maintained

If any item is missing:

STATUS = IN PROGRESS

---

## **AI Agent Rule**

Any AI agent working on this project must follow this Definition of Done.

No task may be marked as completed until all requirements in this document are satisfied.