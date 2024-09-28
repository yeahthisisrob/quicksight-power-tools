// src/utils/cloudTrailUtils.ts

import {
  CloudTrailClient,
  LookupEventsCommand,
  LookupEventsCommandInput,
  LookupEventsCommandOutput,
} from "@aws-sdk/client-cloudtrail";
import dayjs from "dayjs";
import { fetchAnalysisDefinition } from "./quicksightUtils";

export interface CloudTrailCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export interface CloudTrailEvent {
  Username: string;
  EventTime: string;
  EventName: string;
  AnalysisId: string;
  Changes: Array<{ left: string; right: any }>;
}

const analysisEventNames = [
  "CreateAnalysis",
  "DeleteAnalysis",
  "UpdateAnalysis",
  "RestoreAnalysis",
];

const dashboardEventNames = [
  "CreateDashboard",
  "UpdateDashboard",
  "DeleteDashboard",
];

const datasetEventNames = ["CreateDataSet", "UpdateDataSet", "DeleteDataSet"];

const datasourceEventNames = [
  "CreateDataSource",
  "UpdateDataSource",
  "DeleteDataSource",
];

const relevantEventNames = [
  ...analysisEventNames,
  ...dashboardEventNames,
  ...datasetEventNames,
  ...datasourceEventNames,
];

export const fetchCloudTrailEvents = async (
  credentials: CloudTrailCredentials,
  analysisId: string,
  daysAgo: number = 30,
  region: string,
): Promise<CloudTrailEvent[]> => {
  const client = new CloudTrailClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
    retryMode: "adaptive",
    maxAttempts: 5,
  });

  const { datasetIds, dataSourceIds } = await fetchAnalysisDefinition(
    credentials,
    analysisId,
    region,
  );

  let allEvents: any[] = [];

  for (const eventName of relevantEventNames) {
    try {
      const events = await fetchEventsForName(client, eventName, daysAgo);
      allEvents.push(...events);
    } catch (error) {
      console.error(`Error fetching events for ${eventName}:`, error);
    }
  }

  return processEvents(allEvents, analysisId, datasetIds, dataSourceIds);
};

const fetchEventsForName = async (
  client: CloudTrailClient,
  eventName: string,
  daysAgo: number,
): Promise<any[]> => {
  let allEvents: any[] = [];
  let nextToken: string | undefined;

  do {
    const params: LookupEventsCommandInput = {
      StartTime: dayjs().subtract(daysAgo, "day").toDate(),
      EndTime: new Date(),
      LookupAttributes: [
        {
          AttributeKey: "EventName",
          AttributeValue: eventName,
        },
      ],
      MaxResults: 50,
    };

    if (nextToken) {
      params.NextToken = nextToken;
    }

    try {
      const command = new LookupEventsCommand(params);
      const response: LookupEventsCommandOutput = await client.send(command);

      if (response.Events) {
        allEvents.push(...response.Events);
      }

      nextToken = response.NextToken;

      if (!response.Events?.length && !nextToken) {
        break;
      }
    } catch (error: any) {
      if (error.name === "InvalidSignatureException") {
        console.error(
          "Invalid signature. This might be due to expired credentials or incorrect clock settings.",
        );
      }
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (nextToken);

  return allEvents;
};

const processEvents = (
  events: any[],
  currentAnalysisId: string,
  datasetIds: string[],
  dataSourceIds: string[],
): CloudTrailEvent[] => {
  const extractIdFromArn = (arn: string): string => {
    const parts = arn.split("/");
    return parts[parts.length - 1];
  };

  const currentAnalysisIdExtracted = currentAnalysisId.includes("/")
    ? extractIdFromArn(currentAnalysisId)
    : currentAnalysisId;

  const filteredEvents = events.filter((event: any) => {
    if (!event.CloudTrailEvent) return false;

    const eventDetails = JSON.parse(event.CloudTrailEvent);
    const eventName = eventDetails.eventName;
    const serviceEventDetails = eventDetails.serviceEventDetails || {};

    let isRelevantEvent = false;

    const extractIdsFromEventDetails = (details: any): any => {
      const ids: any = {};

      const processDetails = (detailItem: any) => {
        if (detailItem.left && detailItem.right) {
          const left = detailItem.left;
          const right = detailItem.right;

          if (left.includes("analysisId")) {
            ids.analysisIds = ids.analysisIds || [];
            ids.analysisIds.push(extractIdFromArn(right));
          }
          if (left.includes("dataSetId")) {
            ids.dataSetIds = ids.dataSetIds || [];
            ids.dataSetIds.push(extractIdFromArn(right));
          }
          if (left.includes("dataSourceId")) {
            ids.dataSourceIds = ids.dataSourceIds || [];
            ids.dataSourceIds.push(extractIdFromArn(right));
          }
        } else if (typeof detailItem === "object") {
          for (const key in detailItem) {
            const value = detailItem[key];
            if (key.includes("analysisId")) {
              ids.analysisIds = ids.analysisIds || [];
              ids.analysisIds.push(extractIdFromArn(value));
            }
            if (key.includes("dataSetId")) {
              ids.dataSetIds = ids.dataSetIds || [];
              if (Array.isArray(value)) {
                ids.dataSetIds.push(...value.map(extractIdFromArn));
              } else {
                ids.dataSetIds.push(extractIdFromArn(value));
              }
            }
            if (key.includes("dataSourceId")) {
              ids.dataSourceIds = ids.dataSourceIds || [];
              if (Array.isArray(value)) {
                ids.dataSourceIds.push(...value.map(extractIdFromArn));
              } else {
                ids.dataSourceIds.push(extractIdFromArn(value));
              }
            }
          }
        }
      };

      if (Array.isArray(details)) {
        details.forEach(processDetails);
      } else if (typeof details === "object" && details !== null) {
        processDetails(details);
      }

      return ids;
    };

    const requestIds = extractIdsFromEventDetails(
      serviceEventDetails.eventRequestDetails,
    );
    const responseIds = extractIdsFromEventDetails(
      serviceEventDetails.eventResponseDetails,
    );

    if (analysisEventNames.includes(eventName)) {
      const analysisIds = [
        ...(requestIds.analysisIds || []),
        ...(responseIds.analysisIds || []),
      ];

      isRelevantEvent = analysisIds.includes(currentAnalysisIdExtracted);
    } else if (dashboardEventNames.includes(eventName)) {
      const analysisIds = requestIds.analysisIds || [];
      isRelevantEvent = analysisIds.includes(currentAnalysisIdExtracted);
    } else if (datasetEventNames.includes(eventName)) {
      const dataSetIdsToCheck = [
        ...(requestIds.dataSetIds || []),
        ...(responseIds.dataSetIds || []),
      ];

      isRelevantEvent = dataSetIdsToCheck.some((id: string) =>
        datasetIds.includes(id),
      );
    } else if (datasourceEventNames.includes(eventName)) {
      const dataSourceIdsToCheck = [
        ...(requestIds.dataSourceIds || []),
        ...(responseIds.dataSourceIds || []),
      ];

      isRelevantEvent = dataSourceIdsToCheck.some((id: string) =>
        dataSourceIds.includes(id),
      );
    }

    return isRelevantEvent;
  });

  const processedEvents = filteredEvents.map((event: any) => {
    const eventDetails = JSON.parse(event.CloudTrailEvent);
    const serviceEventDetails = eventDetails.serviceEventDetails || {};

    let changes: Array<{ left: string; right: any }> = [];

    const addChangesFromDetails = (details: any) => {
      if (Array.isArray(details)) {
        changes.push(...details);
      } else if (typeof details === "object" && details !== null) {
        changes.push(
          ...Object.entries(details).map(([key, value]) => ({
            left: key,
            right: value,
          })),
        );
      }
    };

    addChangesFromDetails(serviceEventDetails.eventRequestDetails);
    addChangesFromDetails(serviceEventDetails.eventResponseDetails);

    const userIdentity = eventDetails.userIdentity || {};
    const userId = userIdentity.userId || userIdentity.onBehalfOf?.userId;
    const userName =
      userIdentity.userName || userId || userIdentity.principalId || "Unknown";

    return {
      Username: userName,
      EventTime: eventDetails.eventTime,
      EventName: eventDetails.eventName,
      AnalysisId: currentAnalysisIdExtracted,
      Changes: changes,
    };
  });

  return processedEvents;
};
