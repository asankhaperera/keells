# A Serverless Keells

Create the following DynamoDB tables

- stock
Partition Key: item_code (N)
Sort Key: location_code (N)

- orders
Partition Key: location_code (N)
Sort Key: order_id (S)

Create following SQS FIFO queue
- orders.fifo
