-- Bảng yêu cầu xuất kho chờ duyệt (chạy một lần trên SmartWarehouseDB)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OutboundRequests')
BEGIN
    CREATE TABLE dbo.OutboundRequests (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        requested_by INT NOT NULL,
        sku NVARCHAR(100) NOT NULL,
        bin_code NVARCHAR(50) NOT NULL,
        quantity INT NOT NULL,
        reason NVARCHAR(500) NULL,
        status VARCHAR(20) NOT NULL CONSTRAINT DF_OutboundRequests_status DEFAULT ('PENDING'),
        reviewed_by INT NULL,
        reviewed_at DATETIME2(0) NULL,
        review_note NVARCHAR(500) NULL,
        created_at DATETIME2(0) NOT NULL CONSTRAINT DF_OutboundRequests_created DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_OutboundRequests_RequestedBy FOREIGN KEY (requested_by) REFERENCES dbo.Users(id),
        CONSTRAINT FK_OutboundRequests_ReviewedBy FOREIGN KEY (reviewed_by) REFERENCES dbo.Users(id),
        CONSTRAINT CK_OutboundRequests_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')),
        CONSTRAINT CK_OutboundRequests_qty CHECK (quantity > 0)
    );
    CREATE INDEX IX_OutboundRequests_status ON dbo.OutboundRequests(status);
    CREATE INDEX IX_OutboundRequests_requester ON dbo.OutboundRequests(requested_by);
END
GO
