USE [norms]
GO
/****** Object:  Table [dbo].[ScheduledDashboard]    Script Date: 27-01-2025 17:12:21 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ScheduledDashboard](
	[Reqid] [int] IDENTITY(1,1) NOT NULL,
	[DashboardCode] [smallint] NOT NULL,
	[Brandid] [smallint] NOT NULL,
	[Brand] [nvarchar](50) NULL,
	[Dealerid] [int] NOT NULL,
	[Dealer] [nvarchar](50) NULL,
	[ScheduledOn] [datetime] NOT NULL,
	[Addedby] [int] NOT NULL,
	[Addedon] [datetime] NOT NULL,
	[Editedby] [int] NULL,
	[Editedon] [datetime] NULL,
	[Status] [tinyint] NOT NULL,
	[Deletedby] [int] NULL,
	[Deletedon] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[Reqid] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[ScheduledDashboard] ADD  DEFAULT ((0)) FOR [Status]
GO
