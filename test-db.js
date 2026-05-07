const { MongoClient } = require('mongodb');

async function main() {
    const uri = "mongodb+srv://officeredixweb_db_user:jatin123@office.qtaujvl.mongodb.net/?retryWrites=true&w=majority";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected successfully to server");
        const databasesList = await client.db().admin().listDatabases();
        console.log("Databases:");
        databasesList.databases.forEach(db => console.log(` - ${db.name}`));
    } catch (e) {
        console.error("Connection failed:");
        console.error(e);
    } finally {
        await client.close();
    }
}

main().catch(console.error);
