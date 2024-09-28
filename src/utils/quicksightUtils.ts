// src/utils/quicksightUtils.ts

import {
  QuickSightClient,
  DescribeAnalysisCommand,
  DescribeAnalysisDefinitionCommand,
  DescribeDataSetCommand,
  DataSet,
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

export const getAnalysisIdFromUrl = (url: string): string | null => {
  const urlObj = new URL(url);
  const queryParamAnalysisId = urlObj.searchParams.get("analysisId");
  if (queryParamAnalysisId) {
    return queryParamAnalysisId;
  }

  const match = url.match(/analyses\/([\w-]+)/);
  return match ? match[1] : null;
};

async function getAwsAccountId(
  credentials: CloudTrailCredentials,
  region: string,
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
  const response = await stsClient.send(command);
  return response.Account!;
}

export const fetchAnalysisMetadata = async (
  credentials: CloudTrailCredentials,
  analysisId: string,
  region: string, // Added region parameter
): Promise<AnalysisMetadata | null> => {
  const client = new QuickSightClient({
    region, // Use the passed region
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  try {
    const accountId = await getAwsAccountId(credentials, region); // Pass region

    const command = new DescribeAnalysisCommand({
      AwsAccountId: accountId,
      AnalysisId: analysisId,
    });

    const response = await client.send(command);

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

export const fetchAnalysisDefinition = async (
  credentials: CloudTrailCredentials,
  analysisId: string,
  region: string, // Added region parameter
): Promise<{
  calculatedFields: CalculatedField[];
  datasetIds: string[];
  dataSourceIds: string[];
}> => {
  const client = new QuickSightClient({
    region, // Use the passed region
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  try {
    const accountId = await getAwsAccountId(credentials, region); // Pass region

    const command = new DescribeAnalysisDefinitionCommand({
      AwsAccountId: accountId,
      AnalysisId: analysisId,
    });

    const response = await client.send(command);
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
              // Extract dataset ID from ARN
              const arnParts = declaration.DataSetArn.split("/");
              const datasetId = arnParts[arnParts.length - 1];
              datasetIds.push(datasetId);
            }
          },
        );
      }

      // Fetch data source IDs for each dataset
      const datasetPromises = datasetIds.map(async (datasetId) => {
        try {
          const describeDataSetCommand = new DescribeDataSetCommand({
            AwsAccountId: accountId,
            DataSetId: datasetId,
          });

          const datasetResponse = await client.send(describeDataSetCommand);

          if (datasetResponse.DataSet) {
            const dataSources = extractDataSourceArnsFromDataSet(
              datasetResponse.DataSet,
            );
            dataSources.forEach((dataSourceArn) => {
              // Extract data source ID from ARN
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
      // Handle other types of physical tables if needed
    });
  }

  return dataSourceArns;
}
