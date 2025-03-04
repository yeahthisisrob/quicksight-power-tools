// ../components/ResourceTags.tsx
import React, { useState, useEffect } from 'react';
import { CloudTrailCredentials } from '../types/CloudTrailCredentials';
import { getResourceTags, getRegionFromUrl, getAccountId, tagCache } from '../utils/tagEnhancer';
import { QuickSightClient, TagResourceCommand, UntagResourceCommand } from '@aws-sdk/client-quicksight';
import { Box, Chip, TextField, Button, Typography } from '@mui/material';

interface ResourceTagsProps {
  resourceType: string;
  resourceId: string;
  credentials: CloudTrailCredentials;
}

interface TagPillProps {
  tag: { Key: string; Value: string };
  resourceType: string;
  resourceId: string;
  credentials: CloudTrailCredentials;
  onTagUpdated: (updatedTag: { Key: string; Value: string }) => void;
  onTagDeleted: (key: string) => void;
}

interface AddTagPillProps {
  resourceType: string;
  resourceId: string;
  credentials: CloudTrailCredentials;
  onTagAdded: (newTag: { Key: string; Value: string }) => void;
}

const TagPill: React.FC<TagPillProps> = ({
  tag,
  resourceType,
  resourceId,
  credentials,
  onTagUpdated,
  onTagDeleted,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [keyValue, setKeyValue] = useState(tag.Key);
  const [valueValue, setValueValue] = useState(tag.Value);

  const handleSave = async () => {
    try {
      const region = getRegionFromUrl();
      const accountId = await getAccountId(credentials);
      const currentTags = await getResourceTags(resourceId, accountId, region, resourceType, credentials);
      const updatedTags = currentTags.filter((t) => t.Key !== tag.Key);
      updatedTags.push({ Key: keyValue, Value: valueValue });

      const quickSightClient = new QuickSightClient({
        region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      });
      const command = new TagResourceCommand({
        ResourceArn: `arn:aws:quicksight:${region}:${accountId}:${resourceType}/${resourceId}`,
        Tags: updatedTags,
      });
      await quickSightClient.send(command);

      onTagUpdated({ Key: keyValue, Value: valueValue });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating tag:', error);
    }
  };

  const handleDelete = async () => {
    try {
      const region = getRegionFromUrl();
      const accountId = await getAccountId(credentials);
      const quickSightClient = new QuickSightClient({
        region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      });
      const command = new UntagResourceCommand({
        ResourceArn: `arn:aws:quicksight:${region}:${accountId}:${resourceType}/${resourceId}`,
        TagKeys: [tag.Key],
      });
      await quickSightClient.send(command);

      onTagDeleted(tag.Key);
      setIsEditing(false);
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  if (isEditing) {
    return (
      <Box display="flex" alignItems="center" sx={{ mr: 0.5, mb: 0.5 }}>
        <TextField
          label="Key"
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value)}
          size="small"
          sx={{ width: 120, mr: 0.5 }}
          inputProps={{ style: { fontSize: '0.65rem', height: '1.5rem' } }}
        />
        <TextField
          label="Value"
          value={valueValue}
          onChange={(e) => setValueValue(e.target.value)}
          size="small"
          sx={{ width: 120, mr: 0.5 }}
          inputProps={{ style: { fontSize: '0.65rem', height: '1.5rem' } }}
        />
        <Button
          onClick={handleSave}
          variant="contained"
          size="small"
          sx={{ mr: 0.5, minWidth: 'auto', padding: '4px 8px', fontSize: '0.7rem' }}
        >
          Save
        </Button>
        <Button
          onClick={() => setIsEditing(false)}
          variant="outlined"
          size="small"
          sx={{ mr: 0.5, minWidth: 'auto', padding: '4px 8px', fontSize: '0.7rem' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          variant="outlined"
          size="small"
          color="error"
          sx={{ minWidth: 'auto', padding: '4px 8px', fontSize: '0.7rem' }}
        >
          Delete
        </Button>
      </Box>
    );
  }

  return (
    <Chip
      label={`${tag.Key}: ${tag.Value}`}
      onClick={() => setIsEditing(true)}
      clickable
      sx={{ mr: 0.5, mb: 0.5, fontSize: '0.75rem', height: 24 }}
    />
  );
};

const AddTagPill: React.FC<AddTagPillProps> = ({
  resourceType,
  resourceId,
  credentials,
  onTagAdded,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [keyValue, setKeyValue] = useState('');
  const [valueValue, setValueValue] = useState('');

  const handleSave = async () => {
    if (!keyValue || !valueValue) return;
    try {
      const region = getRegionFromUrl();
      const accountId = await getAccountId(credentials);
      const currentTags = await getResourceTags(resourceId, accountId, region, resourceType, credentials);
      const updatedTags = [...currentTags, { Key: keyValue, Value: valueValue }];

      const quickSightClient = new QuickSightClient({
        region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      });
      const command = new TagResourceCommand({
        ResourceArn: `arn:aws:quicksight:${region}:${accountId}:${resourceType}/${resourceId}`,
        Tags: updatedTags,
      });
      await quickSightClient.send(command);

      onTagAdded({ Key: keyValue, Value: valueValue });
      setIsAdding(false);
      setKeyValue('');
      setValueValue('');
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  if (isAdding) {
    return (
      <Box display="flex" alignItems="center" sx={{ mr: 0.5, mb: 0.5 }}>
        <TextField
          label="Key"
          placeholder="Key"
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value)}
          size="small"
          sx={{ width: 120, mr: 0.5 }}
          inputProps={{ style: { fontSize: '0.65rem', height: '1.5rem' } }}
        />
        <TextField
          label="Value"
          placeholder="Value"
          value={valueValue}
          onChange={(e) => setValueValue(e.target.value)}
          size="small"
          sx={{ width: 120, mr: 0.5 }}
          inputProps={{ style: { fontSize: '0.65rem', height: '1.5rem' } }}
        />
        <Button
          onClick={handleSave}
          variant="contained"
          size="small"
          sx={{ mr: 0.5, minWidth: 'auto', padding: '4px 8px', fontSize: '0.7rem' }}
        >
          Add
        </Button>
        <Button
          onClick={() => setIsAdding(false)}
          variant="outlined"
          size="small"
          sx={{ minWidth: 'auto', padding: '4px 8px', fontSize: '0.7rem' }}
        >
          Cancel
        </Button>
      </Box>
    );
  }

  return (
    <Chip
      label="Add Tag"
      onClick={() => setIsAdding(true)}
      clickable
      sx={{ mr: 0.5, mb: 0.5, fontSize: '0.75rem', height: 24, backgroundColor: '#d0e0ff' }}
    />
  );
};

export const ResourceTags: React.FC<ResourceTagsProps> = ({ resourceType, resourceId, credentials }) => {
  const [tags, setTags] = useState<{ Key: string; Value: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTags = async () => {
      const cacheKey = `${resourceType}-${resourceId}`;
      if (tagCache[cacheKey]) {
        setTags(tagCache[cacheKey]);
      } else {
        const region = getRegionFromUrl();
        const accountId = await getAccountId(credentials);
        const fetchedTags = await getResourceTags(resourceId, accountId, region, resourceType, credentials);
        setTags(fetchedTags);
        tagCache[cacheKey] = fetchedTags;
      }
      setLoading(false);
    };
    fetchTags().catch((error) => {
      console.error('Error fetching tags:', error);
      setLoading(false);
    });
  }, [resourceType, resourceId, credentials]);

  if (loading) {
    return <Typography variant="body2">Loading tags...</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {tags.map((tag) => (
        <TagPill
          key={tag.Key}
          tag={tag}
          resourceType={resourceType}
          resourceId={resourceId}
          credentials={credentials}
          onTagUpdated={(updatedTag) => {
            const newTags = tags.map((t) => (t.Key === updatedTag.Key ? updatedTag : t));
            setTags(newTags);
            const cacheKey = `${resourceType}-${resourceId}`;
            tagCache[cacheKey] = newTags;
          }}
          onTagDeleted={(key) => {
            const newTags = tags.filter((t) => t.Key !== key);
            setTags(newTags);
            const cacheKey = `${resourceType}-${resourceId}`;
            tagCache[cacheKey] = newTags;
          }}
        />
      ))}
      <AddTagPill
        resourceType={resourceType}
        resourceId={resourceId}
        credentials={credentials}
        onTagAdded={(newTag) => {
          const newTags = [...tags, newTag];
          setTags(newTags);
          const cacheKey = `${resourceType}-${resourceId}`;
          tagCache[cacheKey] = newTags;
        }}
      />
    </Box>
  );
};
