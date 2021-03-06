/*
 * the module for micro.bit car
 */

//% blockId="DadsToolBox" block="Dad's ToolBox"
//% color="#aa7b0d" weight=20 icon="\uf1b9"
namespace DadsToolBox {
    const PCA9685_OSC_FREQENCE = 25000000; // Hz
    const PCA9685_RESTART_DELAY = 500; // us
    const PCA9685_BASE_ADDR = 0x41;
    const MODE_1_SUB_ADDR = 0x00;
    const PRESCARE_SUB_ADDR = 0xfe;
    const PWM_STEP_MIN = 800;
    const PWM_STEP_MAX = 4096;
    const PWM_UPDATE_RATE = 50; // Hz
    const MOTOR_DELAY_TIME = 500000; // us
    const STEP_PER_LEVEL = 16;
    const LED_0_SUB_ADDR = 0x06;
    const LED_SUB_ADDR_OFFSET = 4;

    const LAMP_R_CHANNEL = 0;
    const LAMP_G_CHANNEL = 1;
    const LAMP_B_CHANNEL = 2;
    const LAMP_RIGHT_CHANNEL = 6;
    const LAMP_LEFT_CHANNEL = 7;
    const LAMP_FORWARD_CHANNEL = 8;
    const LEFT_MOTOR_A_CHANNEL = 12;
    const LEFT_MOTOR_B_CHANEEL = 13;
    const RIGHT_MOTOR_A_CHANNEL = 14;
    const RIGHT_MOTOR_B_CHANNEL = 15;

    const PING_TX_PIN = DigitalPin.P14;
    const PING_RX_PIN = DigitalPin.P15;
    const PING_MAX_DISTANCE = 400; // cm
    const MICROSECOND_PER_CENTIMETER = 58;
    const PING_DETECTION_DURATION =
        PING_MAX_DISTANCE * MICROSECOND_PER_CENTIMETER + 100;

    const FRONT_IR_TX_PIN = DigitalPin.P9;
    const FRONT_IR_RX_PIN = AnalogPin.P3;
    const BOUNDARY_OF_DETECTED = 800;
    const BOTTOM_LEFT_IR_RX_PIN = AnalogPin.P2;
    const BOTTOM_RIGHT_IR_RX_PIN = AnalogPin.P1;
    const BOUNDARY_OF_COLOR = 500;

    const SERVO_MOTOR_1_CHANNEL = 3;
    const SERVO_MOTOR_2_CHANNEL = 4;
    const SERVO_MOTOR_3_CHANNEL = 5;
    const SERVO_MOTOR_ROTATION_DEGREE = 90;
    const SERVO_MOTOR_MIN_DUTY = 500; // us
    const SERVO_MOTOR_MAX_DUTY = 2400; // us
    const SERVO_MOTOR_ONE_CYCLE = 20000; // us
    const SERVO_MOTOR_DUTY_PER_DEGREE =
        (SERVO_MOTOR_MAX_DUTY - SERVO_MOTOR_MIN_DUTY) /
        (2 * SERVO_MOTOR_ROTATION_DEGREE);

    let _initialized = false;
    let _dir_lamp_flash = false;

    function setPwmUpdateRate(rate: number): void {
        let prescare = PCA9685_OSC_FREQENCE / PWM_STEP_MAX / rate - 1;

        pins.i2cWriteNumber(
            PCA9685_BASE_ADDR,
            MODE_1_SUB_ADDR,
            NumberFormat.Int8BE
        );
        let older = pins.i2cReadNumber(PCA9685_BASE_ADDR, NumberFormat.UInt8BE);
        let newer = (older & 0x7f) | 0x10;

        let buffs = pins.createBuffer(2);
        buffs[0] = MODE_1_SUB_ADDR;
        buffs[1] = newer;
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);

        buffs[0] = PRESCARE_SUB_ADDR;
        buffs[1] = prescare;
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);

        control.waitMicros(PCA9685_RESTART_DELAY);
        buffs[0] = MODE_1_SUB_ADDR;
        buffs[1] = older | 0xa1;
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);
    }

    function initPCA9685(): void {
        let buffs = pins.createBuffer(2);
        buffs[0] = MODE_1_SUB_ADDR;
        buffs[1] = 0x0;
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);
        setPwmUpdateRate(PWM_UPDATE_RATE);
        _initialized = true;
    }

    export enum CarDir {
        //% blockId="forward" block="MOVE FORWARD"
        MOVE_FORWARD = 0,
        //% blockId="left" block="TURN LEFT"
        TURN_LEFT,
        //% blockId="right" block="TURN RIGHT"
        TURN_RIGHT,
        //% blockId="backward" block="MOVE BACKWARD"
        MOVE_BACKWARD,
        //% blockId="stop" block="STOP"
        STOP
    }

    function doMotorRun(motor: string, dir: string, speed: number): void {
        let fChannel: number;
        switch (motor) {
            case 'r':
                fChannel =
                    dir == 'f' ? RIGHT_MOTOR_B_CHANNEL : RIGHT_MOTOR_A_CHANNEL;
                break;
            default:
                fChannel =
                    dir == 'f' ? LEFT_MOTOR_A_CHANNEL : LEFT_MOTOR_B_CHANEEL;
                break;
        }

        let buffs = pins.createBuffer(5);
        buffs[0] = LED_0_SUB_ADDR + fChannel * LED_SUB_ADDR_OFFSET;
        buffs[1] = 0;
        buffs[2] = 0;
        buffs[3] = speed & 0xff;
        buffs[4] = (speed >> 8) & 0x0f;

        if (!_initialized) initPCA9685();
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);
    }

    //% blockId=letCarMove block="let car %dir|with speed %speed"
    //% speed.min=50 speed.max=255
    //% color="#007acc"
    export function letCarMove(
        dir: CarDir = CarDir.STOP,
        speed: number = 50
    ): void {
        doMotorRun('l', 'f', 0);
        doMotorRun('l', 'b', 0);
        doMotorRun('r', 'f', 0);
        doMotorRun('r', 'b', 0);
        control.waitMicros(MOTOR_DELAY_TIME);

        speed *= STEP_PER_LEVEL;
        if (speed <= PWM_STEP_MIN) speed = PWM_STEP_MIN;

        switch (dir) {
            case CarDir.MOVE_FORWARD:
                doMotorRun('l', 'f', speed);
                doMotorRun('r', 'f', speed);
                break;
            case CarDir.TURN_LEFT:
                doMotorRun('l', 'b', speed);
                doMotorRun('r', 'f', speed);
                break;
            case CarDir.TURN_RIGHT:
                doMotorRun('l', 'f', speed);
                doMotorRun('r', 'b', speed);
                break;
            case CarDir.MOVE_BACKWARD:
                doMotorRun('l', 'b', speed);
                doMotorRun('r', 'b', speed);
                break;
            default:
                doMotorRun('l', 'f', 0);
                doMotorRun('l', 'b', 0);
                doMotorRun('r', 'f', 0);
                doMotorRun('r', 'b', 0);
                break;
        }
    }

    export enum MainLampColor {
        //% blockId="lampRed" block="RED"
        RED,
        //% blockId="lampGreen" block="GREEN"
        GREEN,
        //% blockId="lampBlue" block="BLUE"
        BLUE,
        //% blockId="lampWhite" block="WHITE"
        WHITE,
        //% blockId="lampYellow" block="YELLOW"
        YELLOW,
        //% blockId="lampCyan" block="CYAN"
        CYAN,
        //% blobkId="lampMagenta" block="MAGENTA"
        MAGENTA
    }

    function setMainLamp(r: number = 0, g: number = 0, b: number = 0): void {
        if (!_initialized) initPCA9685();

        let buffs = pins.createBuffer(13);
        buffs[0] = LED_0_SUB_ADDR + LAMP_R_CHANNEL * LED_SUB_ADDR_OFFSET;
        buffs[1] = 0;
        buffs[2] = 0;
        buffs[3] = r == 0 ? 0 : r & 0xff;
        buffs[4] = r == 0 ? 0 : (r >> 8) & 0x0f;
        buffs[5] = 0;
        buffs[6] = 0;
        buffs[7] = g == 0 ? 0 : g & 0xff;
        buffs[8] = g == 0 ? 0 : (g >> 8) & 0x0f;
        buffs[9] = 0;
        buffs[10] = 0;
        buffs[11] = b == 0 ? 0 : b & 0xff;
        buffs[12] = b == 0 ? 0 : (b >> 8) & 0x0f;
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);
    }

    //% blockId="turnMainLampOnWithColor" block="turn main lamp on with color %color"
    //% color="#009933"
    export function turnMainLampOnWithColor(
        color: MainLampColor = MainLampColor.WHITE
    ): void {
        let full = PWM_STEP_MAX | 0x0ffe;

        switch (color) {
            case MainLampColor.WHITE:
                setMainLamp(full, full, full);
                break;
            case MainLampColor.RED:
                setMainLamp(full, 0, 0);
                break;
            case MainLampColor.GREEN:
                setMainLamp(0, full, 0);
                break;
            case MainLampColor.BLUE:
                setMainLamp(0, 0, full);
                break;
            case MainLampColor.YELLOW:
                setMainLamp(full, full, 0);
                break;
            case MainLampColor.CYAN:
                setMainLamp(0, full, full);
                break;
            case MainLampColor.MAGENTA:
                setMainLamp(full, 0, full);
                break;
        }
    }

    //% blockId="turnMainLampOnWithRGB" block="turn main lamp on with red %r|green %g|blue %b"
    //% r.min=0 r.max=255 g.min=0 g.max=255 b.min=0 b.max=255
    //% color="#009933"
    export function turnMainLampOnWithRGB(
        r: number = 0,
        g: number = 0,
        b: number = 0
    ): void {
        setMainLamp(r * STEP_PER_LEVEL, g * STEP_PER_LEVEL, b * STEP_PER_LEVEL);
    }

    //% blockId="turnMainLampOff" block="turn main lamp off"
    //% color="#009933"
    export function turnMainLampOff(): void {
        setMainLamp(0, 0, 0);
    }

    export enum DirLamp {
        //% blockId="leftLamp" block="LEFT LAMP"
        LEFT_LAMP = 0,
        //% blockId="forwardLamp" block="FORWARD LAMP"
        FORWARD_LAMP,
        //% blockId="rightLamp" block="RIGHT LAMP"
        RIGHT_LAMP
    }

    export enum DirLampStatus {
        //% blockId="DirLampOn" block="ON"
        ON = 0,
        //% blockId="DirLampOff" block="OFF"
        OFF
    }

    function setDirLamp(channel: number, status: boolean): void {
        if (!_initialized) initPCA9685();
        let hByte = status ? 0 : 0x0f;
        let lByte = status ? 0 : 0xff;
        let buffs = pins.createBuffer(channel == -1 ? 13 : 5);
        buffs[0] =
            LED_0_SUB_ADDR +
            LED_SUB_ADDR_OFFSET *
                (channel == -1 ? LAMP_RIGHT_CHANNEL : channel);
        buffs[1] = 0;
        buffs[2] = 0;
        buffs[3] = channel == -1 ? 0xff : lByte;
        buffs[4] = channel == -1 ? 0x0f : hByte;
        if (channel == -1) {
            buffs[5] = 0;
            buffs[6] = 0;
            buffs[7] = 0xff;
            buffs[8] = 0x0f;
            buffs[9] = 0;
            buffs[10] = 0;
            buffs[11] = 0xff;
            buffs[12] = 0x0f;
        }
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);
    }

    function getDirLampChannel(dir: DirLamp): number {
        switch (dir) {
            case DirLamp.LEFT_LAMP:
                return LAMP_LEFT_CHANNEL;
            case DirLamp.FORWARD_LAMP:
                return LAMP_FORWARD_CHANNEL;
            case DirLamp.RIGHT_LAMP:
                return LAMP_RIGHT_CHANNEL;
            default:
                return 0;
        }
    }

    //% blockId="turnDirLamp" block="turn %dir| %status"
    //% color="#009933"
    export function turnDirLamp(
        dir: DirLamp = DirLamp.LEFT_LAMP,
        status: DirLampStatus = DirLampStatus.OFF
    ): void {
        let channel = getDirLampChannel(dir);
        if (channel > 0)
            setDirLamp(channel, status == DirLampStatus.ON ? true : false);
    }

    //% blockId="turnAllDirLampOff" block="turn all direction lamp off"
    //% color="#009933"
    export function turnAllDirLampOff(): void {
        _dir_lamp_flash = false;
        setDirLamp(-1, false);
    }

    //% blockId="letDirLampFlash" block="let all direction as marquees with interval %duration seconds"
    //% duration.min=0 duration.max=10
    //% color="#009933"
    export function letDirLampFlash(duration: number = 0): void {
        duration *= 1000;
        turnAllDirLampOff();
        _dir_lamp_flash = true;
        control.inBackground(() => {
            while (_dir_lamp_flash) {
                turnDirLamp(DirLamp.LEFT_LAMP, DirLampStatus.ON);
                basic.pause(duration);
                turnDirLamp(DirLamp.FORWARD_LAMP, DirLampStatus.ON);
                basic.pause(duration);
                turnDirLamp(DirLamp.RIGHT_LAMP, DirLampStatus.ON);
                basic.pause(duration);
                turnDirLamp(DirLamp.LEFT_LAMP, DirLampStatus.OFF);
                basic.pause(duration);
                turnDirLamp(DirLamp.FORWARD_LAMP, DirLampStatus.OFF);
                basic.pause(duration);
                turnDirLamp(DirLamp.RIGHT_LAMP, DirLampStatus.OFF);
                basic.pause(duration);
                turnDirLamp(DirLamp.RIGHT_LAMP, DirLampStatus.ON);
                basic.pause(duration);
                turnDirLamp(DirLamp.FORWARD_LAMP, DirLampStatus.ON);
                basic.pause(duration);
                turnDirLamp(DirLamp.LEFT_LAMP, DirLampStatus.ON);
                basic.pause(duration);
                turnDirLamp(DirLamp.RIGHT_LAMP, DirLampStatus.OFF);
                basic.pause(duration);
                turnDirLamp(DirLamp.FORWARD_LAMP, DirLampStatus.OFF);
                basic.pause(duration);
                turnDirLamp(DirLamp.LEFT_LAMP, DirLampStatus.OFF);
                basic.pause(duration);
            }
            turnAllDirLampOff();
        });
    }

    //% blockId="getDistanceByPing" block="the distance in cm of obstace."
    //% color="#e67300"
    export function getDistanceByPing(): number {
        pins.setPull(PING_TX_PIN, PinPullMode.PullDown);
        pins.digitalWritePin(PING_TX_PIN, 0);
        control.waitMicros(2);
        pins.digitalWritePin(PING_TX_PIN, 1);
        control.waitMicros(10);
        pins.digitalWritePin(PING_TX_PIN, 0);

        let d = pins.pulseIn(
            PING_RX_PIN,
            PulseValue.High,
            PING_DETECTION_DURATION
        );
        return Math.round(d / MICROSECOND_PER_CENTIMETER);
    }

    //% blockId="detectObstacleByFrontIr" block="detected the obstacle by front IR2"
    //% color="#cc0000"
    export function detectObstacleByFrontIr(): boolean {
        let ret = false;
        pins.digitalWritePin(FRONT_IR_TX_PIN, 0);
        let rec = pins.analogReadPin(FRONT_IR_RX_PIN);
        if (rec < BOUNDARY_OF_DETECTED) ret = true;
        pins.digitalWritePin(FRONT_IR_TX_PIN, 1);
        return ret;
    }

    export enum DetectSide {
        //% blockId="leftSide" block="LEFT SIDE"
        LEFT = 0,
        //% blockId="rightSide" block="RIGHT SIDE"
        RIGHT
    }

    export enum LineStyle {
        //% blockId="blackLine" block="BLACK LINE"
        BLACK = 0,
        //% blockId="whiteLine" block="WHITE LINE"
        WHITE
    }

    function isWhiteLine(value: number): boolean {
        return value < BOUNDARY_OF_COLOR;
    }

    //% blockId="detectLineByBottomIr" block="detected %style| on %side by bottom IR"
    //% color="#cc0000"
    export function detectLineByBottomIr(
        side: DetectSide = DetectSide.LEFT,
        style: LineStyle = LineStyle.BLACK
    ): boolean {
        let ret = false;
        let pin =
            side == DetectSide.LEFT
                ? BOTTOM_LEFT_IR_RX_PIN
                : BOTTOM_RIGHT_IR_RX_PIN;
        let v = pins.analogReadPin(pin);
        switch (style) {
            case LineStyle.BLACK:
                ret = !isWhiteLine(v);
                break;
            case LineStyle.WHITE:
                ret = isWhiteLine(v);
                break;
        }
        return ret;
    }

    export enum ServoMotorId {
        //% blockId="ServoMotor1" block="Servo 1"
        J2 = 0,
        //% blockId="ServoMotor2" block="Servo 2"
        J3,
        //% blockId="ServoMotor3" block="Servo 3"
        J4
    }

    //% blockId="positionServoMotor" block="position %motor| at %angle degrees."
    //% color="#cc0000"
    //% angle.min=-90 angle.max=90 angle.default=0
    export function positionServoMotor(motor: ServoMotorId, angle: number) {
        if (!_initialized) initPCA9685();

        let opMotor = 0;
        switch (motor) {
            case ServoMotorId.J2:
                opMotor = SERVO_MOTOR_1_CHANNEL;
                break;
            case ServoMotorId.J3:
                opMotor = SERVO_MOTOR_2_CHANNEL;
                break;
            case ServoMotorId.J4:
                opMotor = SERVO_MOTOR_3_CHANNEL;
                break;
        }

        let opAngle: number = angle + SERVO_MOTOR_ROTATION_DEGREE;
        let opDuty: number =
            opAngle * SERVO_MOTOR_DUTY_PER_DEGREE + SERVO_MOTOR_MIN_DUTY;
        let opTravel: number = (opDuty / SERVO_MOTOR_ONE_CYCLE) * PWM_STEP_MAX;

        let buffs = pins.createBuffer(5);
        buffs[0] = LED_0_SUB_ADDR + LED_SUB_ADDR_OFFSET * opMotor;
        buffs[1] = 0;
        buffs[2] = 0;
        buffs[3] = 0;
        buffs[4] = 0;
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);

        control.waitMicros(15);
        buffs[0] = LED_0_SUB_ADDR + LED_SUB_ADDR_OFFSET * opMotor;
        buffs[1] = 0;
        buffs[2] = 0;
        buffs[3] = opTravel & 0xff;
        buffs[4] = (opTravel >> 8) & 0x0f;
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);
    }
}
