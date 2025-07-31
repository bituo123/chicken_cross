import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './styles/Game.scss';

const Game = ({ onInstall, showInstallButton }) => {
  const mountRef = useRef(null);
  const gameRef = useRef(null);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const [cameraParams, setCameraParams] = useState({
    rotationX: 50, // 度数
    rotationY: 0, // 度数
    rotationZ: 0, // 度数
    distance: 500,
    zoom: 2,
  });

  const resetCameraParams = () => {
    console.log("切换相机");

    setCameraParams({
      rotationX: 50,
      rotationY: 20,
      rotationZ: 10,
      distance: 500,
      zoom: 2,
    });
  };
  useEffect(() => {
    if (!mountRef.current) return;

    // 游戏初始化
    const initGame = () => {
      // ========== 游戏参数配置 ==========
      const zoom = 2;
      const chickenSize = 15;
      const positionWidth = 42;
      const columns = 17;
      const boardWidth = positionWidth * columns;
      const stepTime = 200;

      // ========== 游戏状态变量 ==========
      let lanes = [];
      let currentLane = 0;
      let currentColumn = Math.floor(columns / 2);
      let previousTimestamp = null;
      let startMoving = false;
      let moves = [];
      let stepStartTimestamp = null;
      let isMoving = false; // 添加移动状态标志

      // ========== Three.js场景初始化 ==========
      const scene = new THREE.Scene();

      // ========== 摄像机设置 ==========
      const distance = cameraParams.distance;
      const camera = new THREE.OrthographicCamera(
        window.innerWidth / -2,
        window.innerWidth / 2,
        window.innerHeight / 2,
        window.innerHeight / -2,
        0.1,
        10000
      );

      // 使用状态中的相机参数
      camera.rotation.x = (cameraParams.rotationX * Math.PI) / 180;
      camera.rotation.y = (cameraParams.rotationY * Math.PI) / 180;
      camera.rotation.z = (cameraParams.rotationZ * Math.PI) / 180;

      const initialCameraPositionY = -Math.tan(camera.rotation.x) * distance;
      const initialCameraPositionX =
        Math.tan(camera.rotation.y) *
        Math.sqrt(distance ** 2 + initialCameraPositionY ** 2);
      camera.position.y = initialCameraPositionY;
      camera.position.x = initialCameraPositionX;
      camera.position.z = distance;

      // ========== 渲染器设置 ==========
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      });
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setSize(window.innerWidth, window.innerHeight);
      mountRef.current.appendChild(renderer.domElement);

      // ========== 光照设置 - 修复亮度问题 ==========
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.8); // 增加强度
      scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.0); // 增加强度
      dirLight.position.set(-100, -100, 200);
      dirLight.castShadow = true;
      scene.add(dirLight);

      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      const d = 500;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;

      const backLight = new THREE.DirectionalLight(0xffffff, 0.6); // 改为白光并增加强度
      backLight.position.set(200, 200, 50);
      backLight.castShadow = true;
      scene.add(backLight);

      // 添加环境光增加整体亮度
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      // ========== 纹理创建 ==========
      function Texture(width, height, rects) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.fillStyle = "rgba(0,0,0,0.6)";
        rects.forEach((rect) => {
          context.fillRect(rect.x, rect.y, rect.w, rect.h);
        });
        return new THREE.CanvasTexture(canvas);
      }

      // 纹理定义
      const carFrontTexture = new Texture(40, 80, [{ x: 0, y: 10, w: 30, h: 60 }]);
      const carBackTexture = new Texture(40, 80, [{ x: 10, y: 10, w: 30, h: 60 }]);
      const carRightSideTexture = new Texture(110, 40, [
        { x: 10, y: 0, w: 50, h: 30 },
        { x: 70, y: 0, w: 30, h: 30 },
      ]);
      const carLeftSideTexture = new Texture(110, 40, [
        { x: 10, y: 10, w: 50, h: 30 },
        { x: 70, y: 10, w: 30, h: 30 },
      ]);

      const truckFrontTexture = new Texture(30, 30, [{ x: 15, y: 0, w: 10, h: 30 }]);
      const truckRightSideTexture = new Texture(25, 30, [{ x: 0, y: 15, w: 10, h: 10 }]);
      const truckLeftSideTexture = new Texture(25, 30, [{ x: 0, y: 5, w: 10, h: 10 }]);

      // ========== 游戏对象创建函数 ==========
      function Wheel() {
        const wheel = new THREE.Mesh(
          new THREE.BoxGeometry(12 * zoom, 33 * zoom, 12 * zoom),
          new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true })
        );
        wheel.position.z = 6 * zoom;
        return wheel;
      }

      function Car() {
        const car = new THREE.Group();
        const vechicleColors = [0xa52523, 0xbdb638, 0x78b14b];
        const color = vechicleColors[Math.floor(Math.random() * vechicleColors.length)];

        const main = new THREE.Mesh(
          new THREE.BoxGeometry(60 * zoom, 30 * zoom, 15 * zoom),
          new THREE.MeshPhongMaterial({ color, flatShading: true })
        );
        main.position.z = 12 * zoom;
        main.castShadow = true;
        main.receiveShadow = true;
        car.add(main);

        const cabin = new THREE.Mesh(
          new THREE.BoxGeometry(33 * zoom, 24 * zoom, 12 * zoom),
          [
            new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carBackTexture }),
            new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carFrontTexture }),
            new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carRightSideTexture }),
            new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carLeftSideTexture }),
            new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }),
            new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }),
          ]
        );
        cabin.position.x = 6 * zoom;
        cabin.position.z = 25.5 * zoom;
        cabin.castShadow = true;
        cabin.receiveShadow = true;
        car.add(cabin);

        const frontWheel = new Wheel();
        frontWheel.position.x = -18 * zoom;
        car.add(frontWheel);

        const backWheel = new Wheel();
        backWheel.position.x = 18 * zoom;
        car.add(backWheel);

        return car;
      }

      function Truck() {
        const truck = new THREE.Group();
        const vechicleColors = [0xa52523, 0xbdb638, 0x78b14b];
        const color = vechicleColors[Math.floor(Math.random() * vechicleColors.length)];

        const base = new THREE.Mesh(
          new THREE.BoxGeometry(100 * zoom, 25 * zoom, 5 * zoom),
          new THREE.MeshLambertMaterial({ color: 0xb4c6fc, flatShading: true })
        );
        base.position.z = 10 * zoom;
        truck.add(base);

        const cargo = new THREE.Mesh(
          new THREE.BoxGeometry(75 * zoom, 35 * zoom, 40 * zoom),
          new THREE.MeshPhongMaterial({ color: 0xb4c6fc, flatShading: true })
        );
        cargo.position.x = 15 * zoom;
        cargo.position.z = 30 * zoom;
        cargo.castShadow = true;
        cargo.receiveShadow = true;
        truck.add(cargo);

        const cabin = new THREE.Mesh(
          new THREE.BoxGeometry(25 * zoom, 30 * zoom, 30 * zoom),
          [
            new THREE.MeshPhongMaterial({ color, flatShading: true }),
            new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckFrontTexture }),
            new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckRightSideTexture }),
            new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckLeftSideTexture }),
            new THREE.MeshPhongMaterial({ color, flatShading: true }),
            new THREE.MeshPhongMaterial({ color, flatShading: true }),
          ]
        );
        cabin.position.x = -40 * zoom;
        cabin.position.z = 20 * zoom;
        cabin.castShadow = true;
        cabin.receiveShadow = true;
        truck.add(cabin);

        const frontWheel = new Wheel();
        frontWheel.position.x = -38 * zoom;
        truck.add(frontWheel);

        const middleWheel = new Wheel();
        middleWheel.position.x = -10 * zoom;
        truck.add(middleWheel);

        const backWheel = new Wheel();
        backWheel.position.x = 30 * zoom;
        truck.add(backWheel);

        return truck;
      }

      function Tree() {
        const tree = new THREE.Group();
        const threeHeights = [20, 45, 60];

        const trunk = new THREE.Mesh(
          new THREE.BoxGeometry(15 * zoom, 15 * zoom, 20 * zoom),
          new THREE.MeshPhongMaterial({ color: 0x4d2926, flatShading: true })
        );
        trunk.position.z = 10 * zoom;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        const height = threeHeights[Math.floor(Math.random() * threeHeights.length)];

        const crown = new THREE.Mesh(
          new THREE.BoxGeometry(30 * zoom, 30 * zoom, height * zoom),
          new THREE.MeshLambertMaterial({ color: 0x7aa21d, flatShading: true })
        );
        crown.position.z = (height / 2 + 20) * zoom;
        crown.castShadow = true;
        crown.receiveShadow = false;
        tree.add(crown);

        return tree;
      }

      function Chicken() {
        const chicken = new THREE.Group();

        const body = new THREE.Mesh(
          new THREE.BoxGeometry(chickenSize * zoom, chickenSize * zoom, 20 * zoom),
          new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true })
        );
        body.position.z = 10 * zoom;
        body.castShadow = true;
        body.receiveShadow = true;
        chicken.add(body);

        const rowel = new THREE.Mesh(
          new THREE.BoxGeometry(2 * zoom, 4 * zoom, 2 * zoom),
          new THREE.MeshLambertMaterial({ color: 0xf0619a, flatShading: true })
        );
        rowel.position.z = 21 * zoom;
        rowel.castShadow = true;
        rowel.receiveShadow = false;
        chicken.add(rowel);

        return chicken;
      }

      function Road() {
        const road = new THREE.Group();

        const createSection = (color) =>
          new THREE.Mesh(
            new THREE.PlaneGeometry(boardWidth * zoom, positionWidth * zoom),
            new THREE.MeshPhongMaterial({ color })
          );

        const middle = createSection(0x454a59);
        middle.receiveShadow = true;
        road.add(middle);

        const left = createSection(0x393d49);
        left.position.x = -boardWidth * zoom;
        road.add(left);

        const right = createSection(0x393d49);
        right.position.x = boardWidth * zoom;
        road.add(right);

        return road;
      }

      function Grass() {
        const grass = new THREE.Group();

        const createSection = (color) =>
          new THREE.Mesh(
            new THREE.BoxGeometry(boardWidth * zoom, positionWidth * zoom, 3 * zoom),
            new THREE.MeshPhongMaterial({ color })
          );

        const middle = createSection(0xbaf455);
        middle.receiveShadow = true;
        grass.add(middle);

        const left = createSection(0x99c846);
        left.position.x = -boardWidth * zoom;
        grass.add(left);

        const right = createSection(0x99c846);
        right.position.x = boardWidth * zoom;
        grass.add(right);

        grass.position.z = 1.5 * zoom;
        return grass;
      }

      function Lane(index) {
        this.index = index;
        const laneTypes = ["car", "truck", "forest"];
        const laneSpeeds = [2, 2.5, 3];

        this.type = index <= 0 ? "field" : laneTypes[Math.floor(Math.random() * laneTypes.length)];

        switch (this.type) {
          case "field": {
            this.mesh = new Grass();
            break;
          }
          case "forest": {
            this.mesh = new Grass();
            this.occupiedPositions = new Set();
            this.threes = [1, 2, 3, 4].map(() => {
              const tree = new Tree();
              let position;
              do {
                position = Math.floor(Math.random() * columns);
              } while (this.occupiedPositions.has(position));
              this.occupiedPositions.add(position);
              tree.position.x =
                (position * positionWidth + positionWidth / 2) * zoom - (boardWidth * zoom) / 2;
              this.mesh.add(tree);
              return tree;
            });
            break;
          }
          case "car": {
            this.mesh = new Road();
            this.direction = Math.random() >= 0.5;

            const occupiedPositions = new Set();
            this.vechicles = [1, 2, 3].map(() => {
              const vechicle = new Car();
              let position;
              do {
                position = Math.floor((Math.random() * columns) / 2);
              } while (occupiedPositions.has(position));
              occupiedPositions.add(position);
              vechicle.position.x =
                (position * positionWidth * 2 + positionWidth / 2) * zoom - (boardWidth * zoom) / 2;
              if (!this.direction) vechicle.rotation.z = Math.PI;
              this.mesh.add(vechicle);
              return vechicle;
            });

            this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
            break;
          }
          case "truck": {
            this.mesh = new Road();
            this.direction = Math.random() >= 0.5;

            const occupiedPositions = new Set();
            this.vechicles = [1, 2].map(() => {
              const vechicle = new Truck();
              let position;
              do {
                position = Math.floor((Math.random() * columns) / 3);
              } while (occupiedPositions.has(position));
              occupiedPositions.add(position);
              vechicle.position.x =
                (position * positionWidth * 3 + positionWidth / 2) * zoom - (boardWidth * zoom) / 2;
              if (!this.direction) vechicle.rotation.z = Math.PI;
              this.mesh.add(vechicle);
              return vechicle;
            });

            this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
            break;
          }
        }
      }

      // ========== 车道生成函数 ==========
      const generateLanes = () =>
        [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
          .map((index) => {
            const lane = new Lane(index);
            lane.mesh.position.y = index * positionWidth * zoom;
            scene.add(lane.mesh);
            return lane;
          })
          .filter((lane) => lane.index >= 0);

      const addLane = () => {
        const index = lanes.length;
        const lane = new Lane(index);
        lane.mesh.position.y = index * positionWidth * zoom;
        scene.add(lane.mesh);
        lanes.push(lane);
      };

      // ========== 创建小鸡并添加到场景 ==========
      const chicken = new Chicken();
      scene.add(chicken);

      // ========== 辅助函数：检查位置是否安全 ==========
      const isPositionSafe = (lane, column) => {
        if (lane < 0 || column < 0 || column >= columns) return false;
        if (!lanes[lane]) return true; // 如果车道不存在，认为是安全的
        
        if (lanes[lane].type === "forest") {
          return !lanes[lane].occupiedPositions.has(column);
        }
        return true;
      };

      // ========== 游戏初始化函数 - 修复重生位置问题 ==========
      const initializeValues = () => {
        lanes = generateLanes();
        currentLane = 0;
        currentColumn = Math.floor(columns / 2);
        
        // 确保重生位置安全
        while (!isPositionSafe(currentLane, currentColumn)) {
          currentColumn = Math.floor(Math.random() * columns);
        }
        
        previousTimestamp = null;
        startMoving = false;
        moves = [];
        stepStartTimestamp = null;
        isMoving = false; // 重置移动状态

        // 正确设置小鸡位置
        chicken.position.x = (currentColumn * positionWidth + positionWidth / 2) * zoom - (boardWidth * zoom) / 2;
        chicken.position.y = currentLane * positionWidth * zoom;
        chicken.position.z = 0;

        camera.position.y = initialCameraPositionY;
        camera.position.x = initialCameraPositionX + (currentColumn * positionWidth + positionWidth / 2) * zoom - (boardWidth * zoom) / 2;

        setScore(0);
        setIsGameOver(false);
      };

      initializeValues();

      // ========== 移动函数 - 修复连续操作和碰撞检测问题 ==========
      const move = (direction) => {
        if (isGameOver || isMoving) return; // 防止在移动过程中重复操作

        const finalPositions = {
          lane: currentLane,
          column: currentColumn,
        };

        if (direction === "forward") {
          finalPositions.lane++;
        } else if (direction === "backward") {
          finalPositions.lane--;
        } else if (direction === "left") {
          finalPositions.column--;
        } else if (direction === "right") {
          finalPositions.column++;
        }

        // 边界检查
        if (finalPositions.column < 0 || finalPositions.column >= columns) return;
        if (direction === "backward" && finalPositions.lane < 0) return;

        // 修复碰撞检测 - 检查目标位置是否安全
        if (direction === "forward") {
          if (!isPositionSafe(finalPositions.lane, finalPositions.column)) return;
          if (!stepStartTimestamp) startMoving = true;
          addLane();
        } else if (direction === "backward") {
          if (!isPositionSafe(finalPositions.lane, finalPositions.column)) return;
          if (!stepStartTimestamp) startMoving = true;
        } else if (direction === "left") {
          if (!isPositionSafe(finalPositions.lane, finalPositions.column)) return;
          if (!stepStartTimestamp) startMoving = true;
        } else if (direction === "right") {
          if (!isPositionSafe(finalPositions.lane, finalPositions.column)) return;
          if (!stepStartTimestamp) startMoving = true;
        }
        
        moves.push(direction);
        isMoving = true; // 设置移动状态
      };

      // ========== 动画循环函数 ==========
      function animate(timestamp) {
        requestAnimationFrame(animate);

        if (!previousTimestamp) previousTimestamp = timestamp;
        const delta = timestamp - previousTimestamp;
        previousTimestamp = timestamp;

        // 车辆移动动画
        lanes.forEach((lane) => {
          if (lane.type === "car" || lane.type === "truck") {
            const aBitBeforeTheBeginingOfLane = (-boardWidth * zoom) / 2 - positionWidth * 2 * zoom;
            const aBitAfterTheEndOFLane = (boardWidth * zoom) / 2 + positionWidth * 2 * zoom;
            
            lane.vechicles.forEach((vechicle) => {
              if (lane.direction) {
                vechicle.position.x =
                  vechicle.position.x < aBitBeforeTheBeginingOfLane
                    ? aBitAfterTheEndOFLane
                    : (vechicle.position.x -= (lane.speed / 16) * delta);
              } else {
                vechicle.position.x =
                  vechicle.position.x > aBitAfterTheEndOFLane
                    ? aBitBeforeTheBeginingOfLane
                    : (vechicle.position.x += (lane.speed / 16) * delta);
              }
            });
          }
        });

        // 小鸡移动动画
        if (startMoving) {
          stepStartTimestamp = timestamp;
          startMoving = false;
        }

        if (stepStartTimestamp) {
          const moveDeltaTime = timestamp - stepStartTimestamp;
          const moveDeltaDistance = Math.min(moveDeltaTime / stepTime, 1) * positionWidth * zoom;
          const jumpDeltaDistance = Math.sin(Math.min(moveDeltaTime / stepTime, 1) * Math.PI) * 8 * zoom;

          switch (moves[0]) {
            case "forward": {
              camera.position.y = initialCameraPositionY + currentLane * positionWidth * zoom + moveDeltaDistance;
              chicken.position.y = currentLane * positionWidth * zoom + moveDeltaDistance;
              chicken.position.z = jumpDeltaDistance;
              break;
            }
            case "backward": {
              camera.position.y = initialCameraPositionY + currentLane * positionWidth * zoom - moveDeltaDistance;
              chicken.position.y = currentLane * positionWidth * zoom - moveDeltaDistance;
              chicken.position.z = jumpDeltaDistance;
              break;
            }
            case "left": {
              camera.position.x =
                initialCameraPositionX +
                (currentColumn * positionWidth + positionWidth / 2) * zoom -
                (boardWidth * zoom) / 2 -
                moveDeltaDistance;
              chicken.position.x =
                (currentColumn * positionWidth + positionWidth / 2) * zoom -
                (boardWidth * zoom) / 2 -
                moveDeltaDistance;
              chicken.position.z = jumpDeltaDistance;
              break;
            }
            case "right": {
              camera.position.x =
                initialCameraPositionX +
                (currentColumn * positionWidth + positionWidth / 2) * zoom -
                (boardWidth * zoom) / 2 +
                moveDeltaDistance;
              chicken.position.x =
                (currentColumn * positionWidth + positionWidth / 2) * zoom -
                (boardWidth * zoom) / 2 +
                moveDeltaDistance;
              chicken.position.z = jumpDeltaDistance;
              break;
            }
          }

          if (moveDeltaTime > stepTime) {
            switch (moves[0]) {
              case "forward": {
                currentLane++;
                setScore(currentLane);
                break;
              }
              case "backward": {
                currentLane--;
                setScore(currentLane);
                break;
              }
              case "left": {
                currentColumn--;
                break;
              }
              case "right": {
                currentColumn++;
                break;
              }
            }
            moves.shift();
            stepStartTimestamp = moves.length === 0 ? null : timestamp;
            if (moves.length === 0) {
              isMoving = false; // 移动完成，重置移动状态
            }
          }
        }

        // 碰撞检测
        if (lanes[currentLane].type === "car" || lanes[currentLane].type === "truck") {
          const chickenMinX = chicken.position.x - (chickenSize * zoom) / 2;
          const chickenMaxX = chicken.position.x + (chickenSize * zoom) / 2;
          const vechicleLength = { car: 60, truck: 105 }[lanes[currentLane].type];

          lanes[currentLane].vechicles.forEach((vechicle) => {
            const carMinX = vechicle.position.x - (vechicleLength * zoom) / 2;
            const carMaxX = vechicle.position.x + (vechicleLength * zoom) / 2;
            if (chickenMaxX > carMinX && chickenMinX < carMaxX) {
              setIsGameOver(true);
              lanes.forEach((lane) => scene.remove(lane.mesh));
              initializeValues();
            }
          });
        }

        renderer.render(scene, camera);
      }

      // 开始动画循环
      requestAnimationFrame(animate);

      // 返回游戏控制函数
      return {
        move,
        cleanup: () => {
          if (mountRef.current && renderer.domElement) {
            mountRef.current.removeChild(renderer.domElement);
          }
          renderer.dispose();
        }
      };
    };

    const game = initGame();
    gameRef.current = game;

    // 键盘事件监听
    const handleKeyDown = (event) => {
      if (event.keyCode === 38) {
        game.move("forward");
      } else if (event.keyCode === 40) {
        game.move("backward");
      } else if (event.keyCode === 37) {
        game.move("left");
      } else if (event.keyCode === 39) {
        game.move("right");
      }
    };

    // 手势控制
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const minSwipeDistance = 50;
    let isTouching = false;

    const handleTouchStart = (event) => {
      event.preventDefault();
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isTouching = true;
        setShowControls(false);
      }
    };

    const handleTouchMove = (event) => {
      if (isTouching) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = (event) => {
      event.preventDefault();
      if (isTouching && event.changedTouches.length === 1) {
        const touch = event.changedTouches[0];
        touchEndX = touch.clientX;
        touchEndY = touch.clientY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        if (absDeltaX > minSwipeDistance || absDeltaY > minSwipeDistance) {
          if (absDeltaX > absDeltaY) {
            if (deltaX > 0) {
              game.move("right");
            } else {
              game.move("left");
            }
          } else {
            if (deltaY > 0) {
              game.move("backward");
            } else {
              game.move("forward");
            }
          }
        }
      }
      isTouching = false;
    };

    const handleTouchCancel = () => {
      isTouching = false;
    };

    // 窗口大小调整
    const handleResize = () => {
      // 这里可以添加窗口大小调整逻辑
    };

    // 添加事件监听器
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: false });
    document.addEventListener("touchcancel", handleTouchCancel, { passive: false });
    window.addEventListener("resize", handleResize);

    // 清理函数
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchCancel);
      window.removeEventListener("resize", handleResize);
      
      if (gameRef.current) {
        gameRef.current.cleanup();
      }
    };
  }, []);

  const handleMove = (direction) => {
    if (gameRef.current) {
      gameRef.current.move(direction);
      setShowControls(false);
    }
  };

  return (
    <div className="game-container">
      {/* 右上角保存按钮 */}
      {showInstallButton && (
        <div className="game-install-button">
          <button className="save-to-local-button" onClick={onInstall}>
            💾 保存到本地
          </button>
        </div>
      )}

      <div className="game-ui">
        <div className="score">分数: {score}</div>
        {isGameOver && (
          <div className="game-over">
            <h2>游戏结束!</h2>
            <p>最终分数: {score}</p>
            {showInstallButton && (
              <button className="install-after-game-button" onClick={onInstall}>
                📱 安装游戏到本地
              </button>
            )}
          </div>
        )}
      </div>
      
      <div ref={mountRef} className="game-canvas" />
      
      {showControls && (
        <div className="game-controls">
          <div className="controls-hint">
            <p>🎮 使用方向键或滑动手势控制小鸡</p>
            <p>📱 在移动设备上滑动屏幕</p>
            <p>⌨️ 在PC上使用方向键</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;