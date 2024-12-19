export const deleteFromMongoose = async(name, mongoD) => {
    delete mongoD.models[name];
    delete mongoD.connection.models[name];
    delete mongoD.__models[name];
    if (mongoD.__sincedModels.has(name)) mongoD.__sincedModels.delete(name);
    await mongoD.removeRelations(name);
}

export const getNestedProperty = async(obj, path) => {
    return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}
