export const changeClient = async (client) => {
    client.__relations = {};
    client.__oldRelations = {};

    client.addRelations = async (fks, modelName) => {
        fks.forEach(([name, fk]) => {
            if (!client.__relations[name]) client.__relations[name] = {};

            client.__relations[name][modelName] = fk;
        });
    };

    client.removeRelations = async (name) => {
        if (client.__relations[name]) {
            await Promise.all(
                Object.keys(client.__relations[name]).map(async (modelName) => {
                    const model = client.models?.[modelName];
                    if (model && model._FKS && model._FKS[name]) {
                        delete model._FKS[name];
                    }
                })
            );
            delete client.__relations[name];
        }

        if (client.__oldRelations[name]) delete client.__oldRelations[name];
    };

    client.saveRelations = async () => {
        client.__oldRelations = JSON.parse(JSON.stringify(client.__relations));
    };

    client.resetRelations = async () => {
        client.__relations = JSON.parse(JSON.stringify(client.__oldRelations));
    };
};
