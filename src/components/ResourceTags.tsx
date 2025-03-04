// ../components/ResourceTags.tsx
import React, { useState, useEffect } from 'react';
import { CloudTrailCredentials } from '../types/CloudTrailCredentials';
import { getResourceTags, getRegionFromUrl, getAccountId, tagCache } from '../utils/tagEnhancer';
import { QuickSightClient, TagResourceCommand, UntagResourceCommand } from '@aws-sdk/client-quicksight';

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

const TagPill: React.FC<TagPillProps> = ({ tag, resourceType, resourceId, credentials, onTagUpdated, onTagDeleted }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [key, setKey] = useState(tag.Key);
  const [value, setValue] = useState(tag.Value);

  const handleSave = async () => {
    try {
      const region = getRegionFromUrl();
      const accountId = await getAccountId(credentials);
      const currentTags = await getResourceTags(resourceId, accountId, region, resourceType, credentials);
      const updatedTags = currentTags.filter((t) => t.Key !== tag.Key);
      updatedTags.push({ Key: key, Value: value });

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

      onTagUpdated({ Key: key, Value: value });
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
      <div style={{ display: 'inline-block', marginRight: '5px' }}>
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          style={{ width: '80px', marginRight: '5px' }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ width: '80px', marginRight: '5px' }}
        />
        <button onClick={handleSave}>Save</button>
        <button onClick={() => setIsEditing(false)} style={{ marginLeft: '5px' }}>Cancel</button>
        <button onClick={handleDelete} style={{ marginLeft: '5px', color: 'red' }}>Delete</button>
      </div>
    );
  }

  return (
    <span
      className="tag-pill"
      onClick={() => setIsEditing(true)}
      style={{
        display: 'inline-block',
        backgroundColor: '#e0e0e0',
        borderRadius: '12px',
        padding: '2px 8px',
        marginRight: '5px',
        fontSize: '12px',
        cursor: 'pointer',
      }}
    >
      {tag.Key}: {tag.Value}
    </span>
  );
};

const AddTagPill: React.FC<AddTagPillProps> = ({ resourceType, resourceId, credentials, onTagAdded }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');

  const handleSave = async () => {
    if (!key || !value) return;
    try {
      const region = getRegionFromUrl();
      const accountId = await getAccountId(credentials);
      const currentTags = await getResourceTags(resourceId, accountId, region, resourceType, credentials);
      const updatedTags = [...currentTags, { Key: key, Value: value }];

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

      onTagAdded({ Key: key, Value: value });
      setIsAdding(false);
      setKey('');
      setValue('');
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  if (isAdding) {
    return (
      <div style={{ display: 'inline-block', marginRight: '5px' }}>
        <input
          type="text"
          placeholder="Key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          style={{ width: '80px', marginRight: '5px' }}
        />
        <input
          type="text"
          placeholder="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ width: '80px', marginRight: '5px' }}
        />
        <button onClick={handleSave}>Add</button>
        <button onClick={() => setIsAdding(false)} style={{ marginLeft: '5px' }}>Cancel</button>
      </div>
    );
  }

  return (
    <span
      className="add-tag-pill"
      onClick={() => setIsAdding(true)}
      style={{
        display: 'inline-block',
        backgroundColor: '#d0e0ff',
        borderRadius: '12px',
        padding: '2px 8px',
        marginRight: '5px',
        fontSize: '12px',
        cursor: 'pointer',
      }}
    >
      Add Tag
    </span>
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
    return <span>Loading tags...</span>;
  }

  return (
    <div>
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
    </div>
  );
};