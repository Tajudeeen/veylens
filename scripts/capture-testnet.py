import grpc
import json
import os
import pathlib
import sys
import service_pb2 as p
import service_pb2_grpc as api

txid = sys.argv[1]
output = pathlib.Path(sys.argv[2])
if len(txid) != 64 or any(c not in '0123456789abcdef' for c in txid):
    raise ValueError('Expected lowercase transaction ID')
host = 'testnet.zec.rocks:443'
channel = grpc.secure_channel(host, grpc.ssl_channel_credentials(pathlib.Path(os.environ['SSL_CERT_FILE']).read_bytes() if os.environ.get('SSL_CERT_FILE') else None))
stub = api.CompactTxStreamerStub(channel)
info = stub.GetLightdInfo(p.Empty(), timeout=30)
if info.chainName != 'test' or info.consensusBranchId != '77190ad9':
    raise RuntimeError('Unexpected testnet network or branch')
transaction = stub.GetTransaction(p.TxFilter(hash=bytes.fromhex(txid)[::-1]), timeout=30)
record = {'txid': txid, 'hex': transaction.data.hex(), 'source': host, 'network': 'testnet', 'reportedHeight': str(transaction.height), 'sourceTipHeight': str(info.blockHeight)}
if 0 < transaction.height <= info.blockHeight:
    block = stub.GetBlock(p.BlockID(height=transaction.height), timeout=30)
    if not any(tx.txid == bytes.fromhex(txid)[::-1] for tx in block.vtx):
        raise RuntimeError('Transaction absent from reported compact block')
    record.update(reportedBlockHash=block.hash[::-1].hex(), compactBlockIncludesTxid=True, reportedBlockTime=block.time)
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({k: v for k, v in record.items() if k != 'hex'}))
channel.close()
