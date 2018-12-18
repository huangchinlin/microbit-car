/*
 * the module for micro.bit car
*/

//% blockId=main block="DadsToolBox"
//% color="#33AA22"
namespace DadsToolBox {
    const PAC9685_BASE_ADDR = 0x41;
    const MODULE_SUB_ADDR = 0x4;
    const LED_0_SUB_ADDR = 0x06
    const LED_SUB_ADDR_OFFSET = 4
    const LEFT_MOTOR_A_CHANNEL = 12
    const LEFT_MOTOR_B_CHANEEL = 13
    const RIGHT_MOTOR_A_CHANNEL = 14
    const RIGHT_MOTOR_B_CHANNEL = 15

    let _initialized = false;

    function initPAC9685() {
        let buffs = pins.createBuffer(2);
        buffs[0] = MODULE_SUB_ADDR;
        buffs[1] = 0x0;
        pins.i2cWriteBuffer(PAC9685_BASE_ADDR, buffs);
        _initialized = true;
    }

    function doMotorRun(motor: string, dir: string, speed: number) {
        let fChannel: number;
        switch (motor) {
            case 'r':
            case 'R':
                fChannel = dir == 'f' || dir == 'F' ? RIGHT_MOTOR_A_CHANNEL : RIGHT_MOTOR_B_CHANNEL;
                break;
            default:
                fChannel = dir == 'f' || dir == 'F' ? LEFT_MOTOR_A_CHANNEL : LEFT_MOTOR_B_CHANEEL;
                break;
        }

        let fSpeed: number;
        if (speed == 0)
            fSpeed = 0;
        else if (speed > 4095)
            fSpeed = 4095;
        else if (speed < 350)
            fSpeed = 350;

        let buffs = pins.createBuffer(5);
        buffs[0] = LED_0_SUB_ADDR + (fChannel * LED_SUB_ADDR_OFFSET);
        buffs[1] = 0;
        buffs[2] = 0;
        buffs[3] = fSpeed & 0xff;
        buffs[4] = (fSpeed >> 8) & 0xff;

        if (!_initialized)
            initPAC9685();
        pins.i2cWriteBuffer(PAC9685_BASE_ADDR, buffs);
    }

    export enum CarDir {
        MOVE_FORWARD = 0,
        TURN_LEFT,
        TURN_RIGHT,
        MOVE_BACKWARD,
        STOP
    }

    //% blockId=letCarMove block="let car %dir with speed %speed"
    export function letCarMove(dir: CarDir = CarDir.MOVE_FORWARD, speed: number = 0) {
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
                doMotorRun("r", "f", 0);
                doMotorRun("l", "b", 0);
                doMotorRun("r", "b", 0);
                break;
        }
    }
}