import { Controller, Get, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';

@Controller('test-tasks')
export class TestTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async test(@Request() req: any) {
    return {
      message: 'Test tasks endpoint working',
      user: req.user,
      timestamp: new Date().toISOString()
    };
  }

  @Get('service-test')
  async testService(@Request() req: any) {
    try {
      const user = req.user;
      const result = await this.tasksService.findAll(user);
      return {
        message: 'TasksService test successful',
        user: user,
        result: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        message: 'TasksService test failed',
        error: error.message,
        stack: error.stack,
        user: req.user,
        timestamp: new Date().toISOString()
      };
    }
  }
}
