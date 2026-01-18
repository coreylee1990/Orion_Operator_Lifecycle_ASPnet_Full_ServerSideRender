-- =====================================================
-- Performance Indexes for Orion Operator Lifecycle
-- Run this script on your SQL Server database
-- =====================================================

-- Check if indexes exist before creating to avoid errors
-- pay_Operators indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Operators_DivisionID' AND object_id = OBJECT_ID('pay_Operators'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Operators_DivisionID 
    ON pay_Operators (DivisionID)
    INCLUDE (ID, FirstName, LastName, StatusID);
    PRINT 'Created IX_Operators_DivisionID';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Operators_StatusID' AND object_id = OBJECT_ID('pay_Operators'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Operators_StatusID 
    ON pay_Operators (StatusID)
    INCLUDE (ID, DivisionID, FirstName, LastName);
    PRINT 'Created IX_Operators_StatusID';
END

-- Composite index for division + status filtering
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Operators_Division_Status' AND object_id = OBJECT_ID('pay_Operators'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Operators_Division_Status 
    ON pay_Operators (DivisionID, StatusID)
    INCLUDE (ID, FirstName, LastName);
    PRINT 'Created IX_Operators_Division_Status';
END

-- pay_Certifications indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Certifications_OperatorID' AND object_id = OBJECT_ID('pay_Certifications'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Certifications_OperatorID 
    ON pay_Certifications (OperatorID)
    INCLUDE (ID, CertTypeID, isApproved, IsDeleted, Date, Cert);
    PRINT 'Created IX_Certifications_OperatorID';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Certifications_CertTypeID' AND object_id = OBJECT_ID('pay_Certifications'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Certifications_CertTypeID 
    ON pay_Certifications (CertTypeID);
    PRINT 'Created IX_Certifications_CertTypeID';
END

-- Composite index for approved, non-deleted certs lookup
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Certifications_Operator_Approved' AND object_id = OBJECT_ID('pay_Certifications'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Certifications_Operator_Approved 
    ON pay_Certifications (OperatorID, isApproved, IsDeleted)
    INCLUDE (ID, CertTypeID, Date, Cert);
    PRINT 'Created IX_Certifications_Operator_Approved';
END

-- pay_StatusTypes indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StatusTypes_DivisionID' AND object_id = OBJECT_ID('pay_StatusTypes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_StatusTypes_DivisionID 
    ON pay_StatusTypes (DivisionID)
    INCLUDE (Id, Status, PizzaStatusID, OrderID, isDeleted);
    PRINT 'Created IX_StatusTypes_DivisionID';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StatusTypes_PizzaStatusID' AND object_id = OBJECT_ID('pay_StatusTypes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_StatusTypes_PizzaStatusID 
    ON pay_StatusTypes (PizzaStatusID)
    INCLUDE (Id, Status, DivisionID, OrderID, isDeleted);
    PRINT 'Created IX_StatusTypes_PizzaStatusID';
END

-- Composite for division + active status lookup
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StatusTypes_Division_Active' AND object_id = OBJECT_ID('pay_StatusTypes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_StatusTypes_Division_Active 
    ON pay_StatusTypes (DivisionID, isDeleted)
    INCLUDE (Id, Status, PizzaStatusID, OrderID);
    PRINT 'Created IX_StatusTypes_Division_Active';
END

-- pay_PizzaStatus indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PizzaStatus_ClientID' AND object_id = OBJECT_ID('pay_PizzaStatus'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PizzaStatus_ClientID 
    ON pay_PizzaStatus (ClientID)
    INCLUDE (ID, Status, Description);
    PRINT 'Created IX_PizzaStatus_ClientID';
END

-- pay_CertTypes indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CertTypes_PizzaStatusID' AND object_id = OBJECT_ID('pay_CertTypes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_CertTypes_PizzaStatusID 
    ON pay_CertTypes (PizzaStatusID)
    INCLUDE (ID, Certification, DivisionID, isDeleted);
    PRINT 'Created IX_CertTypes_PizzaStatusID';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CertTypes_DivisionID' AND object_id = OBJECT_ID('pay_CertTypes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_CertTypes_DivisionID 
    ON pay_CertTypes (DivisionID)
    INCLUDE (ID, Certification, PizzaStatusID, isDeleted);
    PRINT 'Created IX_CertTypes_DivisionID';
END

-- Composite for PizzaStatus + Division lookup (common in cert requirements)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CertTypes_PizzaStatus_Division' AND object_id = OBJECT_ID('pay_CertTypes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_CertTypes_PizzaStatus_Division 
    ON pay_CertTypes (PizzaStatusID, DivisionID, isDeleted)
    INCLUDE (ID, Certification, Description);
    PRINT 'Created IX_CertTypes_PizzaStatus_Division';
END

-- pay_StatusTracker indexes (for days-in-status calculations)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'pay_StatusTracker')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StatusTracker_OperatorID' AND object_id = OBJECT_ID('pay_StatusTracker'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_StatusTracker_OperatorID 
        ON pay_StatusTracker (OperatorID);
        PRINT 'Created IX_StatusTracker_OperatorID';
    END
END

PRINT '';
PRINT '=====================================================';
PRINT 'Index creation complete!';
PRINT '=====================================================';

-- Optional: Update statistics after creating indexes
-- EXEC sp_updatestats;
