import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { PublicBookController } from './public-book.controller';
import { Book, BookSchema } from './entities/book.entity';
import { User, UserSchema } from '../auth/entities/user.entity';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Book.name, schema: BookSchema },
      // 在读数统计与删除权限校验需要读取用户
      { name: User.name, schema: UserSchema },
    ]),
    UploadModule,
  ],
  // PublicBookController 放前面：游客用的 books/public 路由优先于 books/:id 匹配
  controllers: [PublicBookController, BookController],
  providers: [BookService],
  exports: [BookService],
})
export class BookModule {}
