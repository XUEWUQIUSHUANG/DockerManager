const Docker = require('dockerode');

/**
 * @typedef {Object} DockerImage
 * @property {string} name - 镜像名称和标签，例如: 'nginx:latest'
 * @property {string} [containerName] - 容器名称，默认为镜像名称加上 '-container'
 * @property {Object} options - 容器配置选项
 * @property {Object} [options.HostConfig] - 主机配置
 * @property {Object} [options.HostConfig.PortBindings] - 端口绑定配置，例如: { '80/tcp': [{ HostPort: '8080' }] }
 * @property {string[]} [options.Env] - 环境变量数组，例如: ['NODE_ENV=production']
 * @property {Object} [options.Volumes] - 卷配置，例如: { '/data': {} }
 * @property {Object} [options.ExposedPorts] - 暴露的端口，例如: { '80/tcp': {} }
 */

class DockerManager {

    /**
     * 创建 DockerManager 实例
     * @constructor
     */
    constructor() {
        this.docker = new Docker();
        /** @private @type {DockerImage[]} */
        this._runningImageList = [];
        /** @private @type {DockerImage[]} */
        this._stoppingImageList = [];
    }

    /**
     * 初始化并启动多个 Docker 镜像
     * @param {DockerImage[]} imageList - Docker 镜像配置数组
     * @returns {Promise<void>} 返回一个 Promise，完成时表示所有镜像都已初始化
     * @throws {Error} 当任何镜像的初始化失败时抛出错误
     */
    async init(imageList, IsStartContainer = true) {
        try {
            imageList.forEach(async (Image) => {
                Image.containerName = this._formatContainerName(Image.name);
                await this.startContainer(Image, IsStartContainer);
            })
        } catch (error) {
            console.error('Error initializing images:', error);
            throw error;
        }
    }

    /**
     * 拉取并可选启动 Docker 镜像
     * @param {DockerImage} Image - Docker 镜像配置
     * @param {boolean} [IsStartContainer=true] - 是否在拉取后自动启动容器
     * @returns {Promise<void>} 返回一个 Promise，完成时表示操作成功
     * @throws {Error} 当拉取镜像失败时抛出错误
     */
    async pullImage(Image, IsStartContainer) {
        try {
            const images = await this.docker.listImages();
            const exist = images.some(image => image.RepoTags && image.RepoTags.includes(Image.name));

            if (!exist) {
                return new Promise((resolve, reject) => {
                    this.docker.pull(Image.name, (err, stream) => {
                        if (err) reject(err);

                        stream.on('data', (data) => {
                            console.log(data.toString());
                        });

                        stream.on('end', async () => {
                            if (IsStartContainer) {
                                await this.startContainer(Image);
                            }
                            resolve();
                        });
                    });
                });
            } else {
                console.log(`Image ${Image.name} already exists`);
                if (IsStartContainer) {
                    await this.startContainer(Image);
                }
            }
        } catch (error) {
            console.error('Error pulling image:', error);
            throw error;
        }
    }

    /**
     * 启动 Docker 容器
     * @param {DockerImage} Image - Docker 镜像配置
     * @returns {Promise<void>} 返回一个 Promise，完成时表示容器已启动
     * @throws {Error} 当启动容器失败时抛出错误
     */
    async startContainer(Image) {
        try {
            const containers = await this.docker.listContainers({ all: true });
            const exist = containers.some(container => container.Names.includes(`/${Image.containerName}`));

            if (!exist) {
                const container = await this.docker.createContainer({
                    Image: Image.name,
                    name: Image.containerName,
                    ...Image.options,
                });
                await container.start();
            } else {
                const container = this.docker.getContainer(Image.containerName);
                const inspect = await container.inspect();

                if (inspect.State.Status !== 'running') {
                    await container.start();
                } else {
                    console.log(`Container ${Image.containerName} is running`);
                    return;
                }
            }
            console.log(`Container ${Image.containerName} started`);
            this._runningImageList.push(Image);
            if (this._stoppingImageList.includes(Image)) {
                this._stoppingImageList = this._stoppingImageList.filter(image => image.containerName !== Image.containerName);
            }
        } catch (error) {
            console.error('Error starting container:', error);
            throw error;
        }
    }

    /**
     * 停止并删除多个 Docker 容器
     * @returns {Promise<void>} 返回一个 Promise，完成时表示所有容器都已停止并删除
     * @param {boolean} [IsRemoveContainer=false] - 是否在停止后删除容器
     * @throws {Error} 当任何容器的停止或删除失败时抛出错误
     */
    async stop(IsRemoveContainer = false) {
        try {
            for (const Image of this._runningImageList) {
                await this.stopContainer(Image, IsRemoveContainer);
            }
        } catch (error) {
            console.error('Error stopping images:', error);
            throw error;
        }
    }

    /**
     * 停止并可选删除 Docker 容器
     * @param {DockerImage} Image - Docker 镜像配置
     * @param {boolean} IsRemoveContainer - 是否在停止后删除容器
     * @returns {Promise<void>} 返回一个 Promise，完成时表示容器已停止（并可能被删除）
     * @throws {Error} 当停止或删除容器失败时抛出错误
     */
    async stopContainer(Image, IsRemoveContainer) {
        try {
            const container = this.docker.getContainer(Image.containerName);
            await container.stop();
            console.log(`Container ${Image.containerName} stopped`);
            this._stoppingImageList.push(Image);
            if (this._runningImageList.includes(Image)) {
                this._runningImageList = this._runningImageList.filter(image => image.containerName !== Image.containerName);
            }
            if (IsRemoveContainer) {
                await container.remove();
                console.log(`Container ${Image.containerName} removed`);
            }
        } catch (error) {
            console.error('Error stopping container:', error);
            throw error;
        }
    }

    /**
     * 获取当前维护的镜像列表
     * @returns {DockerImage[]} 返回镜像配置数组的副本
     */
    getRunningContainerList() {
        return [...this._runningImageList];
    }

    /**
     * 获取当前维护的停止镜像列表
     * @returns {DockerImage[]} 返回镜像配置数组的副本
     */
    getStoppingContainerList() {
        return [...this._stoppingImageList];
    }

    /**
     * 格式化容器名称
     * @private
     * @param {string} imageName - Docker 镜像名称
     * @returns {string} 格式化后的容器名称
     */
    _formatContainerName(imageName) {
        return `${imageName}-container`.replace(':', '-');
    }
}

module.exports = DockerManager;