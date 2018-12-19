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
    const PWM_STEP_MIN = 350;
    const PWM_STEP_MAX = 4096;
    const PWM_UPDATE_RATE = 500; // Hz
    const MOTOR_DELAY_TIME = 5000; // us
    const STEP_PER_LEVEL = 16;
    const LED_0_SUB_ADDR = 0x06;
    const LED_SUB_ADDR_OFFSET = 4;

    const LAMP_R_CHANNEL = 0;
    const LAMP_G_CHANNEL = 1;
    const LAMP_B_CHANNEL = 2;
    const LEFT_MOTOR_A_CHANNEL = 12;
    const LEFT_MOTOR_B_CHANEEL = 13;
    const RIGHT_MOTOR_A_CHANNEL = 14;
    const RIGHT_MOTOR_B_CHANNEL = 15;

    let _initialized = false;

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

        /*
        buffs[0] = MODE_1_SUB_ADDR;
        buffs[1] = older;
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);
        control.waitMicros(5000);
        */

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
        buffs[3] = speed & 0xfe;
        buffs[4] = (speed >> 8) & 0x0f;

        if (!_initialized) initPCA9685();
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);
    }

    //% blockId=letCarMove block="let car %dir|with speed %speed"
    //% speed.min=0 speed.max=255
    //% color="#4da6ff"
    export function letCarMove(
        dir: CarDir = CarDir.MOVE_FORWARD,
        speed: number = 0
    ): void {
        letCarMove(CarDir.STOP, 0);
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

    export enum LampColor {
        //% blockId="lampNone" block="NONE"
        NONE = 0,
        //% blockId="lampRed" block="RED"
        RED,
        //% blockId="lampGreen" block="GREEN"
        GREEN,
        //% blockId="lampBlue" blokc="BLUE"
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

    function doLampOn(r: number = 0, g: number = 0, b: number = 0): void {
        let buffs = pins.createBuffer(13);
        buffs[0] = LED_0_SUB_ADDR + LAMP_R_CHANNEL * LED_SUB_ADDR_OFFSET;
        buffs[1] = 0;
        buffs[2] = 0;
        buffs[3] = r == 0 ? 0 : r & 0xfe;
        buffs[4] = r == 0 ? 0 : (r >> 8) & 0x0f;
        buffs[5] = 0;
        buffs[6] = 0;
        buffs[7] = g == 0 ? 0 : g & 0xfe;
        buffs[8] = g == 0 ? 0 : (g >> 8) & 0x0f;
        buffs[9] = 0;
        buffs[10] = 0;
        buffs[11] = b == 0 ? 0 : b & 0xfe;
        buffs[12] = g == 0 ? 0 : (b >> 8) & 0x0f;
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);
    }

    //% blockId="letLampOnByColor" block="let lamp light on with color %color"
    //% color="#00cc66"
    export function letLampOnByColor(color: LampColor = LampColor.NONE): void {
        switch (color) {
            case LampColor.WHITE:
                doLampOn(PWM_STEP_MAX, PWM_STEP_MAX, PWM_STEP_MAX);
                break;
            case LampColor.RED:
                doLampOn(PWM_STEP_MAX, 0, 0);
                break;
            case LampColor.GREEN:
                doLampOn(0, PWM_STEP_MAX, 0);
                break;
            case LampColor.BLUE:
                doLampOn(0, 0, PWM_STEP_MAX);
                break;
            case LampColor.YELLOW:
                doLampOn(PWM_STEP_MAX, PWM_STEP_MAX, 0);
                break;
            case LampColor.CYAN:
                doLampOn(0, PWM_STEP_MAX, PWM_STEP_MAX);
                break;
            case LampColor.MAGENTA:
                doLampOn(PWM_STEP_MAX, 0, PWM_STEP_MAX);
                break;
            default:
                doLampOn();
                break;
        }
    }

    //% blockId="letLampOnByRGB" block="let lamp light on with red %r|green %g|blue %b"
    //% r.min=0 r.max=255 g.min=0 g.max=255 b.min=0 b.max=255
    //% blockExternalInputs=true
    //% color="#00cc66"
    export function letLampOnByRGB(
        r: number = 0,
        g: number = 0,
        b: number = 0
    ): void {
        doLampOn(r * STEP_PER_LEVEL, g * STEP_PER_LEVEL, b * STEP_PER_LEVEL);
    }
}
