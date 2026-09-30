import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose";
import { LLMController } from "./llm.controller";
import { LLMService } from "./llm.services";
import { DictCache, DictCacheSchema } from "./entities/dict-cache.entity";

@Module({
    imports: [MongooseModule.forFeature([{ name: DictCache.name, schema: DictCacheSchema }])],
    controllers: [LLMController],
    providers:[LLMService]
})

export class LLMModule{}