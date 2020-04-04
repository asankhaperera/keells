let AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

exports.handler = async (event) => {
    try {
        let data = await sqs.receiveMessage({
            QueueUrl: `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.SIGMA_AWS_ACC_ID}/orders.fifo`,
            MaxNumberOfMessages: 1,
            VisibilityTimeout: 30,
            WaitTimeSeconds: 0,
            AttributeNames: ['All']
        }).promise();

        if (data.Messages) {
            //data.Messages.asyncForEach(element => {
                try {
                    let data = await ddb.get({
                        TableName: "stock",
                        Key: {
                            item_code: 1234,
                            location_code: 121
                        }
                    }).promise();

                } catch (err) {
                    // error handling goes here
                };
            //});
        }
    } catch (err) {
        // error handling goes here
    };

    return { "message": "Successfully executed" };
};