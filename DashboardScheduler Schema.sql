USE [UAD_BI]
GO
/****** Object:  Table [dbo].[SBS_DBS_AdminMaster]    Script Date: 10-02-2025 10:55:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SBS_DBS_AdminMaster](
	[Aid] [int] IDENTITY(1,1) NOT NULL,
	[Name] [varchar](50) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Aid] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SBS_DBS_ChangeLog]    Script Date: 10-02-2025 10:55:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SBS_DBS_ChangeLog](
	[DashboardCode] [tinyint] NOT NULL,
	[Workspaceid] [tinyint] NOT NULL,
	[RefBrandid] [smallint] NULL,
	[RefDealerid] [int] NULL,
	[Changedby] [int] NOT NULL,
	[ChangedOn] [datetime] NOT NULL,
	[Requestby] [int] NOT NULL,
	[Requeston] [datetime] NOT NULL,
	[Url] [nvarchar](max) NOT NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SBS_DBS_DashboardDealerMapping]    Script Date: 10-02-2025 10:55:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SBS_DBS_DashboardDealerMapping](
	[DashboardCode] [tinyint] NOT NULL,
	[Dealerid] [int] NOT NULL,
	[LastReplicatedon] [datetime] NULL,
	[Status] [bit] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SBS_DBS_NewrequestTracker]    Script Date: 10-02-2025 10:55:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SBS_DBS_NewrequestTracker](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[brandid] [smallint] NOT NULL,
	[dealerid] [smallint] NOT NULL,
	[dashboardcode] [smallint] NOT NULL,
	[addedby] [int] NOT NULL,
	[addedon] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SBS_DBS_ScheduledDashboard]    Script Date: 10-02-2025 10:55:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SBS_DBS_ScheduledDashboard](
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
	[DashboardRefresh] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[Reqid] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SBS_DBS_STATUS_MASTER]    Script Date: 10-02-2025 10:55:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SBS_DBS_STATUS_MASTER](
	[Status] [tinyint] NOT NULL,
	[StatusName] [varchar](50) NOT NULL,
	[disc] [varchar](255) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Status] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SBS_DBS_WorkspaceMaster]    Script Date: 10-02-2025 10:55:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SBS_DBS_WorkspaceMaster](
	[WorkspaceID] [tinyint] IDENTITY(1,1) NOT NULL,
	[Workspace] [varchar](max) NOT NULL,
	[Addedon] [datetime] NULL,
	[Addedby] [int] NULL,
	[Status] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[WorkspaceID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[si_dealer_list]    Script Date: 10-02-2025 10:55:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[si_dealer_list](
	[brand] [varchar](50) NULL,
	[Dealer] [varchar](50) NULL,
	[Brandid] [varchar](50) NULL,
	[Dealerid] [varchar](50) NULL,
	[status] [bit] NULL,
	[Reqid] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StatusChangeLog]    Script Date: 10-02-2025 10:55:43 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StatusChangeLog](
	[LogID] [int] IDENTITY(1,1) NOT NULL,
	[Reqid] [int] NULL,
	[OldStatus] [varchar](50) NULL,
	[NewStatus] [varchar](50) NULL,
	[ChangedAt] [datetime] NULL,
	[ChangedBy] [varchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[LogID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[SBS_DBS_ScheduledDashboard] ADD  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[si_dealer_list] ADD  DEFAULT ((0)) FOR [status]
GO
ALTER TABLE [dbo].[StatusChangeLog] ADD  DEFAULT (getdate()) FOR [ChangedAt]
GO
