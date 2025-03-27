import {
  QuickSightClient,
  DescribeAnalysisCommand,
  DescribeAnalysisDefinitionCommand,
  DescribeDataSetCommand,
  DescribeDashboardPermissionsCommand,
  DescribeDataSetPermissionsCommand,
  DataSet,
  ListTagsForResourceCommand,
} from "@aws-sdk/client-quicksight";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { CalculatedField } from "../types/CalculatedField";

export interface CloudTrailCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export interface AnalysisMetadata {
  AnalysisId: string;
  Name: string;
  Status: string;
  LastUpdatedTime: Date;
  CreatedTime: Date;
}

/**
 * Extracts the analysis ID from the current URL.
 * @param url The URL to parse.
 * @returns The analysis ID or null if not found.
 */
export const getAnalysisIdFromUrl = (url: string): string | null => {
  const urlObj = new URL(url);
  const queryParamAnalysisId = urlObj.searchParams.get("analysisId");
  if (queryParamAnalysisId) {
    return queryParamAnalysisId;
  }

  const match = url.match(/analyses\/([\w-]+)/);
  return match ? match[1] : null;
};

/**
 * Retries an API call with exponential backoff and jitter on specified errors.
 * @param fn The API call function to retry.
 * @param retryOn Array of error names that trigger a retry.
 * @param maxRetries Maximum number of retries (default: 3).
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retryOn: string[],
  maxRetries: number = 3
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      if (retryOn.includes(error.name) && retries < maxRetries) {
        const delay = (Math.pow(2, retries) + Math.random()) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries++;
      } else {
        throw error;
      }
    }
  }
}

/**
 * Retrieves the AWS account ID using STS with retry logic for throttling errors.
 * @param credentials Credentials for authentication.
 * @param region The AWS region.
 * @returns Promise resolving to the account ID.
 */
export async function getAwsAccountId(
  credentials: CloudTrailCredentials,
  region: string
): Promise<string> {
  const stsClient = new STSClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  const command = new GetCallerIdentityCommand({});
  const response = await retryWithBackoff(() => stsClient.send(command), [
    "Throttling",
  ]);
  return response.Account!;
}

/**
 * Fetches permissions for a QuickSight resource (dashboard or dataset) with retry logic.
 * @param resourceType The type of resource ('dashboard' or 'dataset').
 * @param resourceId The ID of the resource.
 * @param credentials Credentials for authentication.
 * @param region The AWS region.
 * @returns Promise resolving to an array of trimmed principal names.
 */
export async function fetchResourcePermissions(
  resourceType: string,
  resourceId: string,
  credentials: CloudTrailCredentials,
  region: string
): Promise<string[]> {
  const client = new QuickSightClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  try {
    const accountId = await getAwsAccountId(credentials, region);
    let principals: string[] = [];

    if (resourceType === "dashboard") {
      const command = new DescribeDashboardPermissionsCommand({
        AwsAccountId: accountId,
        DashboardId: resourceId,
      });
      const response = await retryWithBackoff(
        () => client.send(command),
        ["ThrottlingException"]
      );
      if (response.Permissions) {
        principals = response.Permissions.map((p) => {
          const arn = p.Principal as string;
          const parts = arn.split("/");
          return parts[parts.length - 1];
        });
      }
    } else if (resourceType === "dataset") {
      const command = new DescribeDataSetPermissionsCommand({
        AwsAccountId: accountId,
        DataSetId: resourceId,
      });
      const response = await retryWithBackoff(
        () => client.send(command),
        ["ThrottlingException"]
      );
      if (response.Permissions) {
        principals = response.Permissions.map((p) => {
          const arn = p.Principal as string;
          const parts = arn.split("/");
          return parts[parts.length - 1];
        });
      }
    } else {
      return [];
    }

    return principals;
  } catch (error) {
    console.error(
      `Error fetching permissions for ${resourceType} (${resourceId}):`,
      error
    );
    throw error;
  }
}

/**
 * Fetches metadata for a QuickSight analysis with retry logic for throttling errors.
 * @param credentials Credentials for authentication.
 * @param analysisId The ID of the analysis.
 * @param region The AWS region.
 * @returns Promise resolving to analysis metadata or null if not found.
 */
export const fetchAnalysisMetadata = async (
  credentials: CloudTrailCredentials,
  analysisId: string,
  region: string
): Promise<AnalysisMetadata | null> => {
  const client = new QuickSightClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  try {
    const accountId = await getAwsAccountId(credentials, region);

    const command = new DescribeAnalysisCommand({
      AwsAccountId: accountId,
      AnalysisId: analysisId,
    });

    const response = await retryWithBackoff(
      () => client.send(command),
      ["ThrottlingException"]
    );

    if (response.Analysis) {
      return {
        AnalysisId: response.Analysis.AnalysisId || "",
        Name: response.Analysis.Name || "",
        Status: response.Analysis.Status || "",
        LastUpdatedTime: response.Analysis.LastUpdatedTime || new Date(),
        CreatedTime: response.Analysis.CreatedTime || new Date(),
      };
    }
  } catch (error) {
    console.error("Error fetching analysis metadata:", error);
    throw error;
  }

  return null;
};

/**
 * Fetches the definition of a QuickSight analysis, including calculated fields,
 * dataset IDs, and data source IDs, with retry logic for throttling errors.
 * @param credentials Credentials for authentication.
 * @param analysisId The ID of the analysis.
 * @param region The AWS region.
 * @returns Promise resolving to the analysis definition details.
 */
export const fetchAnalysisDefinition = async (
  credentials: CloudTrailCredentials,
  analysisId: string,
  region: string
): Promise<{
  calculatedFields: CalculatedField[];
  datasetIds: string[];
  dataSourceIds: string[];
}> => {
  const client = new QuickSightClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  try {
    const accountId = await getAwsAccountId(credentials, region);

    const command = new DescribeAnalysisDefinitionCommand({
      AwsAccountId: accountId,
      AnalysisId: analysisId,
    });

    const response = await retryWithBackoff(
      () => client.send(command),
      ["ThrottlingException"]
    );
    const calculatedFields: CalculatedField[] = [];
    const datasetIds: string[] = [];
    const dataSourceIds: string[] = [];

    if (response.Definition) {
      // Extract calculated fields
      if (response.Definition.CalculatedFields) {
        response.Definition.CalculatedFields.forEach((field) => {
          if (field.Name && field.Expression) {
            calculatedFields.push({
              name: field.Name,
              expression: field.Expression,
              dataSetIdentifier: field.DataSetIdentifier || "Unknown",
            });
          }
        });
      }

      // Extract dataset IDs
      if (response.Definition.DataSetIdentifierDeclarations) {
        response.Definition.DataSetIdentifierDeclarations.forEach(
          (declaration) => {
            if (declaration.DataSetArn) {
              const arnParts = declaration.DataSetArn.split("/");
              const datasetId = arnParts[arnParts.length - 1];
              datasetIds.push(datasetId);
            }
          }
        );
      }

      // Fetch data source IDs for each dataset with retry
      const datasetPromises = datasetIds.map(async (datasetId) => {
        try {
          const describeDataSetCommand = new DescribeDataSetCommand({
            AwsAccountId: accountId,
            DataSetId: datasetId,
          });

          const datasetResponse = await retryWithBackoff(
            () => client.send(describeDataSetCommand),
            ["ThrottlingException"]
          );

          if (datasetResponse.DataSet) {
            const dataSources = extractDataSourceArnsFromDataSet(
              datasetResponse.DataSet
            );
            dataSources.forEach((dataSourceArn) => {
              const arnParts = dataSourceArn.split("/");
              const dataSourceId = arnParts[arnParts.length - 1];
              if (!dataSourceIds.includes(dataSourceId)) {
                dataSourceIds.push(dataSourceId);
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching dataset ${datasetId}:`, error);
        }
      });

      await Promise.all(datasetPromises);
    }

    return { calculatedFields, datasetIds, dataSourceIds };
  } catch (error) {
    console.error("Error fetching analysis definition:", error);
    throw error;
  }
};

/**
 * Fetches resource tags from QuickSight with retry logic for throttling errors.
 * @param resourceArn The ARN of the resource.
 * @param credentials Credentials for authentication.
 * @param region The AWS region.
 * @returns Promise resolving to an array of tags.
 */
export async function getResourceTags(
  resourceArn: string,
  credentials: CloudTrailCredentials,
  region: string
): Promise<Array<{ Key: string; Value: string }>> {
  const client = new QuickSightClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  const command = new ListTagsForResourceCommand({
    ResourceArn: resourceArn,
  });

  const response = await retryWithBackoff(
    () => client.send(command),
    ["ThrottlingException"]
  );
  const tags = (response.Tags || []).filter(
    (tag): tag is { Key: string; Value: string } =>
      tag.Key != null && tag.Value != null
  );
  return tags;
}

/**
 * Extracts data source ARNs from a dataset.
 * @param dataSet The dataset object.
 * @returns Array of data source ARNs.
 */
function extractDataSourceArnsFromDataSet(dataSet: DataSet): string[] {
  const dataSourceArns: string[] = [];

  if (dataSet.PhysicalTableMap) {
    Object.values(dataSet.PhysicalTableMap).forEach((physicalTable) => {
      if (
        physicalTable.RelationalTable &&
        physicalTable.RelationalTable.DataSourceArn
      ) {
        dataSourceArns.push(physicalTable.RelationalTable.DataSourceArn);
      } else if (
        physicalTable.CustomSql &&
        physicalTable.CustomSql.DataSourceArn
      ) {
        dataSourceArns.push(physicalTable.CustomSql.DataSourceArn);
      } else if (
        physicalTable.S3Source &&
        physicalTable.S3Source.DataSourceArn
      ) {
        dataSourceArns.push(physicalTable.S3Source.DataSourceArn);
      }
    });
  }

  return dataSourceArns;
}