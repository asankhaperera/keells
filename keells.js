let AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

exports.handler = async (event) => {

    try {
        let data = await sqs.receiveMessage({
            QueueUrl: `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.SIGMA_AWS_ACC_ID}/orders.fifo`,
            MaxNumberOfMessages: 10,
            VisibilityTimeout: 30,
            WaitTimeSeconds: 0,
            AttributeNames: ['All']
        }).promise();

        if (data.Messages) {

            for (const element of data.Messages) {
                let cusOrder = JSON.parse(element.Body);
                let basket = [];

                for (const lineItem of cusOrder.order) {
                    let requested = lineItem.qty;
                    //console.log("Item : " + lineItem.item_code + " Qty : " + requested);
                    try {

                        let data = await ddb.get({
                            TableName: "stock",
                            Key: {
                                item_code: lineItem.item_code,
                                location_code: cusOrder.location_code
                            }
                        }).promise();

                        if (data.Item) {
                            console.log("Found row");
                            let available = data.Item.quantity;
                            let reserved = 0;
                            let allowed = 0;

                            if (data.Item.reserved) {
                                reserved = data.Item.reserved;
                            }
                            if (available - reserved > 0) {
                                // available to allocate to this order
                                allowed = Math.min(requested, (available - reserved));
                                if (allowed > 0) {
                                    try {
                                        console.log("Updating reserved to : " + (reserved+allowed) + " for item_code : " + lineItem.item_code);
                                        let data = await ddb.update({
                                            TableName: "stock",
                                            Key: {
                                                item_code: lineItem.item_code,
                                                location_code: cusOrder.location_code
                                            },
                                            ExpressionAttributeValues: {
                                                ':allowed': allowed
                                            },
                                            ConditionExpression: "quantity >= reserved",
                                            UpdateExpression: "ADD reserved :allowed"
                                        }).promise();

                                        console.log("Updated reserved qty by adding : " + allowed + " for item_code : " + lineItem.item_code);
                                        // customer can order this amount of stock allowed
                                        basket.push({ "item_code": lineItem.item_code, "qty": allowed });

                                    } catch (err) {
                                        console.log("Error updating DDB : " + JSON.stringify(err));
                                    };
                                }
                            }
                        } else {
                            // item not available at branch
                        }

                    } catch (err) {
                        console.log("Error fetching data from DDB : " + JSON.stringify(err));
                    };
                };
                console.log("Allowed for customer : " + cusOrder.user + " Basket : " + JSON.stringify(basket));
            };
        }

    } catch (err) {
        console.log("Error reading from SQS : " + JSON.stringify(err));
    };


    return { "message": "Successfully executed" };
};