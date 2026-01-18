-- =====================================================
-- Optimized Indexes for pay_Certifications
-- This table is likely the largest and needs special attention
-- =====================================================

-- Check table size first
SELECT 
    t.NAME AS TableName,
    p.rows AS RowCounts,
    SUM(a.total_pages) * 8 / 1024 AS TotalSpaceMB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.OBJECT_ID = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.NAME = 'pay_Certifications'
GROUP BY t.Name, p.Rows;

-- Drop the old index if it exists and create a better one
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Certifications_OperatorID' AND object_id = OBJECT_ID('[dbo].[pay_Certifications]'))
BEGIN
    DROP INDEX [IX_Certifications_OperatorID] ON [dbo].[pay_Certifications];
    PRINT 'Dropped old IX_Certifications_OperatorID';
END

-- Create optimized covering index for OperatorID lookups
-- This includes ALL columns we typically select, so the DB never reads the actual table
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Certifications_OperatorID_Covering' AND object_id = OBJECT_ID('[dbo].[pay_Certifications]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Certifications_OperatorID_Covering]
    ON [dbo].[pay_Certifications] ([OperatorID])
    INCLUDE ([ID], [Cert], [CertTypeID], [Date], [isApproved], [IsDeleted], [RecordAt]);
    PRINT 'Created IX_Certifications_OperatorID_Covering';
END

-- Filtered index for approved certs (most common query pattern)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Certifications_Approved_Active' AND object_id = OBJECT_ID('[dbo].[pay_Certifications]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Certifications_Approved_Active]
    ON [dbo].[pay_Certifications] ([OperatorID], [CertTypeID])
    INCLUDE ([ID], [Cert], [Date], [RecordAt], [IsDeleted])
    WHERE [isApproved] = 1;
    PRINT 'Created IX_Certifications_Approved_Active (filtered index)';
END

-- Update statistics for better query plans
UPDATE STATISTICS [dbo].[pay_Certifications];
PRINT 'Updated statistics for pay_Certifications';

PRINT '';
PRINT '=====================================================';
PRINT 'Certification optimization complete!';
PRINT '=====================================================';

-- Show current indexes on the table
SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    i.is_unique,
    i.has_filter,
    i.filter_definition
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID('[dbo].[pay_Certifications]')
ORDER BY i.name;
