# Docker Manager

一个基于 Node.js 的 Docker 容器管理工具，基于 [dockerode](https://github.com/apocas/dockerode) 封装，提供简单易用的 Docker 容器生命周期管理功能。

## 特性

- 自动拉取和启动Docker镜像
- 管理容器的启动和停止 
- 支持容器配置选项(端口映射、环境变量、数据卷等)
- 维护运行中和已停止容器的状态列表
- 支持批量操作多个容器

## 安装

```bash
npm install docker-manager
```

## 基本使用

```javascript
const DockerManager = require('docker-manager');

// 创建管理器实例
const manager = new DockerManager();

// 配置容器
const containers = [{
  name: 'nginx:latest',
  options: {
    HostConfig: {
      PortBindings: {
        '80/tcp': [{ HostPort: '8080' }]
      }
    }
  }
}];

// 初始化并启动容器
await manager.init(containers);

// 停止所有容器
await manager.stop();
```

## API

### 构造函数

- `new DockerManager()` - 创建Docker管理器实例

### 方法

- `init(imageList, IsStartContainer)` - 初始化并启动多个Docker镜像
- `pullImage(Image, IsStartContainer)` - 拉取并可选启动Docker镜像
- `startContainer(Image)` - 启动指定的Docker容器
- `stop(IsRemoveContainer)` - 停止所有正在运行的容器
- `stopContainer(Image, IsRemoveContainer)` - 停止指定的容器
- `getRunningContainerList()` - 获取运行中的容器列表
- `getStoppingContainerList()` - 获取已停止的容器列表

### 配置选项

容器配置对象支持以下选项:

```javascript
{
  name: 'nginx:latest',           // 镜像名称和标签
  containerName: 'nginx-server',  // 可选,容器名称
  options: {
    HostConfig: {
      PortBindings: {            // 端口映射
        '80/tcp': [{
          HostPort: '8080'
        }]
      }
    },
    Env: ['NODE_ENV=production'], // 环境变量
    Volumes: {                    // 数据卷
      '/data': {}
    },
    ExposedPorts: {              // 暴露端口
      '80/tcp': {}
    }
  }
}
```

## 许可证

[MIT](LICENSE)

## 相关链接

- [dockerode 文档](https://github.com/apocas/dockerode)
- [Docker Engine API](https://docs.docker.com/engine/api/v1.41/)