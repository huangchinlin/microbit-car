/*
 * the module for micro.bit car
*/

//% blockId=main block="Dad's ToolBox"
//% color="#aa7b0d" weight=20 icon="\uf5b6"
namespace DadsToolBox {
    const PCA9685_RESTART_DELAY = 500;
    const PCA9685_BASE_ADDR = 0x41;
    const MODE_1_SUB_ADDR = 0x00;
    const PRESCARE_SUB_ADDR = 0xfe;
    const LED_0_SUB_ADDR = 0x06;
    const LED_SUB_ADDR_OFFSET = 4;
    const LEFT_MOTOR_A_CHANNEL = 12;
    const LEFT_MOTOR_B_CHANEEL = 13;
    const RIGHT_MOTOR_A_CHANNEL = 14;
    const RIGHT_MOTOR_B_CHANNEL = 15;
    const OSC_FREQENCE = 25000000;
    const PWM_MIN_STEP = 350;
    const PWM_MAX_STEP = 4096;
    const PWM_UPDATE_RATE = 500;
    const MOTOR_DELAY_TIME = 5000;
    const MULTIPLE_OF_SPEED = 16;

    let _initialized = false;

    function setPwmUpdateRate(rate: number): void {
        let prescare = OSC_FREQENCE / PWM_MAX_STEP / rate - 1;

        pins.i2cWriteNumber(PCA9685_BASE_ADDR, MODE_1_SUB_ADDR, NumberFormat.Int8BE)
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

        control.waitMicros(PCA9685_RESTART_DELAY * 2);
        buffs[0] = MODE_1_SUB_ADDR;
        buffs[1] = older | 0xa1;
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);
    }

    function initPAC9685(): void {
        let buffs = pins.createBuffer(2);
        buffs[0] = MODE_1_SUB_ADDR;
        buffs[1] = 0x0;
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);
        setPwmUpdateRate(PWM_UPDATE_RATE);
        _initialized = true;
    }

    function doMotorRun(motor: string, dir: string, speed: number): void {
        let fChannel: number;
        switch (motor) {
            case 'r':
            case 'R':
                fChannel = dir == 'f' || dir == 'F' ? RIGHT_MOTOR_B_CHANNEL : RIGHT_MOTOR_A_CHANNEL;
                break;
            default:
                fChannel = dir == 'f' || dir == 'F' ? LEFT_MOTOR_A_CHANNEL : LEFT_MOTOR_B_CHANEEL;
                break;
        }

        let fSpeed: number;
        speed *= MULTIPLE_OF_SPEED;
        if (speed == 0)
            fSpeed = 0;
        else if (speed >= PWM_MAX_STEP)
            fSpeed = PWM_MAX_STEP - 1;
        else if (speed <= PWM_MIN_STEP)
            fSpeed = PWM_MIN_STEP;
        else
            fSpeed = speed;

        let buffs = pins.createBuffer(5);
        buffs[0] = LED_0_SUB_ADDR + (fChannel * LED_SUB_ADDR_OFFSET);
        buffs[1] = 0;
        buffs[2] = 0;
        buffs[3] = fSpeed & 0xff;
        buffs[4] = (fSpeed >> 8) & 0xff;

        if (!_initialized)
            initPAC9685();
        pins.i2cWriteBuffer(PCA9685_BASE_ADDR, buffs);
    }

    export enum CarDir {
        MOVE_FORWARD = 0,
        TURN_LEFT,
        TURN_RIGHT,
        MOVE_BACKWARD,
        STOP
    }

    //% blockId=letCarMove block="let car %dir with speed %speed"
    //% speed.min=0 speed.max=255
    export function letCarMove(dir: CarDir = CarDir.MOVE_FORWARD, speed: number = 0): void {
        letCarMove(CarDir.STOP, 0);
        control.waitMicros(MOTOR_DELAY_TIME);

        switch (dir) {
            case CarDir.MOVE_FORWARD:
                doMotorRun("l", "f", speed);
                doMotorRun("r", "f", speed);
                break;
            case CarDir.TURN_LEFT:
                doMotorRun("l", "b", speed);
                doMotorRun("r", "f", speed);
                break;
            case CarDir.TURN_RIGHT:
                doMotorRun("l", "f", speed);
                doMotorRun("r", "b", speed);
                break;
            case CarDir.MOVE_BACKWARD:
                doMotorRun("l", "b", speed);
                doMotorRun("r", "b", speed);
                break;
            default:
                doMotorRun("l", "f", 0);
                doMotorRun("l", "b", 0);
                doMotorRun("r", "f", 0);
                doMotorRun("r", "b", 0);
                break;
        }
    }
}