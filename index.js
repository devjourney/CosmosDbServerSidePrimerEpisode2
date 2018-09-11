var CosmosClient = require('@azure/cosmos').CosmosClient;
var config = require('./config.js');
var client = new CosmosClient({
    endpoint: config.connection.endpoint,
    auth: { masterKey: config.connection.authKey }
});

async function upsertProcedureAndExecute(sprocDef, docToInsert) {
    const { database } = await client.databases
        .createIfNotExists({ id: config.names.database });
    const { container } = await database.containers
        .createIfNotExists({ id: config.names.collection });
    const { sproc } = await container.storedProcedures.upsert(sprocDef);
    const { body: results, headers } = await sproc.execute(docToInsert);
    if (headers && headers['x-ms-request-charge'])
        console.log(`Charge = ${headers['x-ms-request-charge']} RU`);
    if (results)
        console.log(`DocID = ${JSON.stringify(results)}`);
    // comment in the next line to delete the database
    // await database.delete();
}

var docToSave = {
    message: 'Hello Cosmos DB',
    timestamp: (new Date()).toISOString()
};

var procedureDef = {
    id: 'saveDocument',
    body: function (doc) {
        var link = __.getSelfLink();
        var accepted = __.upsertDocument(
            link,
            doc,
            function (err, newDoc) {
                if (err) throw err;
                __.response.setBody({ id: newDoc.id, completed: true, link: link })
            });
        if (!accepted) __.response.setBody({ completed: false });
    }
};

upsertProcedureAndExecute(procedureDef, docToSave)
    .catch((err) => { console.error(JSON.stringify(err)); });
