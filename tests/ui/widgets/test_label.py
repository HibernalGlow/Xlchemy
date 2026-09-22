from unittest.mock import patch
import pytest

from ui.widgets.label import StyledLabel

@pytest.fixture(autouse=True)
def reset_StyledLabel():
    # Clear before test
    StyledLabel._instances.clear()
    yield

def test_StyledLabel_init(app):
    sample_html = "<div><p>Sample text</p></div>"
    assert not StyledLabel._instances
    label = StyledLabel(sample_html)
    assert StyledLabel._instances == [label]
    assert sample_html in label.text()

def test_StyledLabel_updateStyleForAll(app):
    labels = [StyledLabel("<div><p>Sample text</p></div>") for _ in range(2)]
    custom_qss = "a {{ color: blue; }}"

    with (
        patch("ui.widgets.label.StyledLabel.updateStyle") as mock_updateStyle,
    ):
        labels[0].updateStyleForAll(custom_qss)
        assert mock_updateStyle.call_count == len(StyledLabel._instances)
        assert len(StyledLabel._instances) == 2
        assert custom_qss == StyledLabel._style

def test_StyledLabel_updateStyle(app):
    custom_qss = "<div><p>Sample text</p></div>"
    # autospec=True 必须加：StyledLabel 继承 fluent 接缝里的 qfluentwidgets label，
    # 给它装**裸 MagicMock** 类属性后再构造实例会让进程段错误（崩在
    # qfluentwidgets .../widgets/label.py 的 _init 里）；autospec 的替身不会。
    # 注意 setStyledText 就定义在 StyledLabel 自己身上，autospec 不会替它绑定，
    # 所以后面断言要把实例本身也数进去（继承来的 setText 则不需要，见下一个用例）。
    with patch("ui.widgets.label.StyledLabel.setStyledText", autospec=True) as mock_setStyledText:
        label = StyledLabel(custom_qss)
        mock_setStyledText.assert_called_once_with(label, custom_qss)

def test_StyledLabel_setStyledText(app):
    with patch("ui.widgets.label.StyledLabel.setText", autospec=True) as mock_setText:
        StyledLabel("").setStyledText("text")
        assert mock_setText.call_count == 2    # 1 in the __init__()
        assert "<style>" in mock_setText.call_args[0][0]
        assert "text" in mock_setText.call_args[0][0]
