import { expect } from "chai";
import { toRpcBlockId } from "..";

describe("toRpcBlockId", function () {
    it("should fail for invalid input", function () {
        for (const invalidValue of [
            "0x",
            -4,
            "abc",
            "123",
            "Pending",
            "pending",
            "preconfirmed",
            "Pre_confirmed",
            "LLatest",
            "l1accepted",
            "l2_accepted",
            "accepted",
        ]) {
            try {
                toRpcBlockId(invalidValue);
                expect.fail("Should have failed earlier");
            } catch (err) {
                expect(err).to.have.property("message").that.contains("Invalid block ID");
            }
        }
    });

    it("should work for valid block number", function () {
        for (const validValue of [1, 42, 10000000000000]) {
            expect(toRpcBlockId(validValue)).to.deep.equal({
                block_number: validValue,
            });
        }
    });

    it("should work for valid block hash", function () {
        for (const validValue of [
            "0x1",
            "0x111111111111111111111111111",
            "0xab123",
            "0x0987ab123",
            "0xabcdef0123456789",
        ]) {
            expect(toRpcBlockId(validValue)).to.deep.equal({
                block_hash: validValue,
            });
        }
    });

    it("should work for valid block tag", function () {
        for (const validValue of ["latest", "pre_confirmed", "l1_accepted"]) {
            expect(toRpcBlockId(validValue)).to.deep.equal(validValue);
        }
    });
});
