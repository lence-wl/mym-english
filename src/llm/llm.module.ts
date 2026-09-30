import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm";
import { LLMController } from "./llm.controller";
import { LLMService } from "./llm.services";
import { DictCache } from "./entities/dict-cache.entity";

@Module({
    imports: [TypeOrmModule.forFeature([DictCache])],
    controllers: [LLMController],
    providers:[LLMService]
})

export class LLMModule{}