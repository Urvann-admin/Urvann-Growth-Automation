# Resize EC2 Disk to 10GB - Instructions

## Current Status
- Current disk size: 8GB
- Current usage: ~91% (6.1GB used, 674MB free)
- Target size: 10GB

## Method 1: AWS Console (Recommended)

### Step 1: Resize EBS Volume in AWS Console
1. Go to **AWS Console** → **EC2** → **Volumes**
2. Find the volume attached to instance: `i-*` (for server: `ec2-65-0-92-112.ap-south-1.compute.amazonaws.com`)
3. Select the volume → **Actions** → **Modify Volume**
4. Change size from **8 GB** to **10 GB**
5. Click **Modify**
6. Wait for the status to show "optimizing" then "completed" (usually 1-2 minutes)

### Step 2: Resize Partition and Filesystem (SSH into server)
After the volume resize is complete, SSH into the server and run:

```bash
# Resize the partition
sudo growpart /dev/xvda 1

# Resize the filesystem
sudo resize2fs /dev/xvda1

# Verify
df -h /
```

Or run the script that's already on the server:
```bash
~/resize-filesystem.sh
```

## Method 2: Using AWS CLI (If you have credentials configured)

If you have AWS credentials configured on the server:

```bash
# Get instance and volume info
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone | sed 's/.$//')
VOLUME_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --region $REGION --query 'Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId' --output text)

# Resize volume
aws ec2 modify-volume --volume-id $VOLUME_ID --size 10 --region $REGION

# Wait for completion
aws ec2 wait volume-available --volume-ids $VOLUME_ID --region $REGION

# Resize partition and filesystem
sudo growpart /dev/xvda 1
sudo resize2fs /dev/xvda1
df -h /
```

## Space Cleanup Already Done
- ✅ Cleaned Next.js cache
- ✅ Cleaned npm cache  
- ✅ Cleaned old logs
- ✅ Removed snap packages
- ✅ Cleaned apt cache
- ✅ Current free space: 674MB (91% usage)

## After Resize
Once resized to 10GB, you should have approximately **3.8GB free space** (from current 6.1GB used).

