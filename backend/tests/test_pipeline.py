import pytest
from app.pipeline.parser import LogParser
from app.pipeline.windowing import WindowingBuffer

def test_log_parser():
    parser = LogParser()
    msg1 = "2026-08-15 12:00:00 INFO Receiving block blk_1001 src: /10.251.43.159:55123"
    msg2 = "2026-08-15 12:00:01 INFO Receiving block blk_1002 src: /10.251.43.159:55123"
    
    tmpl_id1, tmpl_str1 = parser.parse(msg1)
    tmpl_id2, tmpl_str2 = parser.parse(msg2)
    
    assert isinstance(tmpl_id1, int)
    assert tmpl_id1 > 0
    # Dynamic parameter should be template masked, keeping same template ID
    assert tmpl_id1 == tmpl_id2

def test_windowing_buffer():
    buf = WindowingBuffer(window_size=3)
    block = "blk_test"
    
    res1 = buf.add_log(block, 1, "msg1")
    assert len(res1) == 3
    assert res1[-1] == (1, "msg1")
    
    res2 = buf.add_log(block, 2, "msg2")
    res3 = buf.add_log(block, 3, "msg3")
    
    assert len(res3) == 3
    assert [item[0] for item in res3] == [1, 2, 3]
