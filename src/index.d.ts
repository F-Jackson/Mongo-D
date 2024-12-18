declare module '@fjackson/mongo-d' {
    import mongoose from 'mongoose';

    export class InitMongoModels {
        models: Record<string, mongoose.Model<any>>;
        relations: Record<string, any>;
        oldRelations: Record<string, any>;
        Schema: mongoose.Schema;

        constructor();

        addRelations(fks: [string, any][], modelName: string): void;
        removeRelations(name: string): void;
        saveRelations(): void;
        resetRelations(): void;
        NewSchema(obj: any, options?: mongoose.SchemaOptions): mongoose.Schema;
        MongoModel(
            name: string,
            schema: mongoose.Schema,
            collection?: string,
            options?: any,
            __mocks?: any
        ): mongoose.Model<any>;
    }
}
