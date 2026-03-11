import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.todo.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: number) {
    const todo = await this.prisma.todo.findUnique({ where: { id } });
    if (!todo) throw new NotFoundException(`Todo #${id} not found`);
    return todo;
  }

  create(dto: CreateTodoDto) {
    return this.prisma.todo.create({ data: dto });
  }

  async update(id: number, dto: UpdateTodoDto) {
    await this.findOne(id);
    return this.prisma.todo.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.todo.delete({ where: { id } });
  }
}
