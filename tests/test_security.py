import pytest
from core.security import (
    validate_url, 
    sanitize_filename, 
    validate_file_size, 
    is_private_ip,
    is_localhost,
    check_ssrf,
    sanitize_folder_path,
)
from core.exceptions import SecurityError
import ipaddress


class TestURLValidation:
    def test_valid_http_url(self):
        url = "https://example.com/video"
        assert validate_url(url) == url
    
    def test_valid_https_url(self):
        url = "https://youtube.com/watch?v=test"
        assert validate_url(url) == url

    def test_valid_magnet_url(self):
        magnet = "magnet:?xt=urn:btih:d6b63c7b7e87b7a702b8d002f23cf9b2a64c483a&dn=Ubuntu"
        assert validate_url(magnet) == magnet

    def test_invalid_magnet_url_format(self):
        with pytest.raises(SecurityError) as exc:
            validate_url("magnet:?invalid=true")
        assert exc.value.code == "INVALID_URL_FORMAT"
    
    def test_invalid_url_missing_scheme(self):
        with pytest.raises(SecurityError) as exc:
            validate_url("example.com/video")
        assert exc.value.code == "INVALID_URL_FORMAT"
    
    def test_invalid_url_ftp_scheme(self):
        with pytest.raises(SecurityError) as exc:
            validate_url("ftp://example.com/file")
        assert exc.value.code == "UNSUPPORTED_SCHEME"
    
    def test_url_too_long(self):
        long_url = "https://example.com/" + "a" * 3000
        with pytest.raises(SecurityError) as exc:
            validate_url(long_url)
        assert exc.value.code == "URL_TOO_LONG"
    
    def test_localhost_blocked(self):
        with pytest.raises(SecurityError) as exc:
            validate_url("http://localhost:8000/video")
        assert exc.value.code == "SSRF_PROTECTION"
    
    def test_localhost_variants_blocked(self):
        for host in ["127.0.0.1", "::1", "0.0.0.0", "localhost.localdomain"]:
            with pytest.raises(SecurityError):
                validate_url(f"http://{host}/video")
    
    def test_private_ips_blocked(self):
        private_ips = [
            "10.0.0.1",
            "172.16.0.1",
            "192.168.1.1",
            "169.254.1.1",
        ]
        for ip in private_ips:
            with pytest.raises(SecurityError):
                validate_url(f"http://{ip}/video")
    
    def test_ipv6_private_blocked(self):
        with pytest.raises(SecurityError):
            validate_url("http://[::1]/video")
        with pytest.raises(SecurityError):
            validate_url("http://[fc00::1]/video")


class TestFilenameSanitization:
    def test_normal_filename(self):
        assert sanitize_filename("video.mp4") == "video.mp4"
    
    def test_removes_dangerous_chars(self):
        assert sanitize_filename('video<>:"/\\|?*.mp4') == "video_________.mp4"
    
    def test_removes_control_chars(self):
        assert sanitize_filename("video\x00\x01\x1f.mp4") == "video___.mp4"
    
    def test_strips_dots_and_spaces(self):
        assert sanitize_filename("  .video.mp4  ") == "video.mp4"
        assert sanitize_filename("...") == "download"
    
    def test_truncates_long_filename(self):
        long_name = "a" * 300 + ".mp4"
        result = sanitize_filename(long_name)
        assert len(result) <= 255
        assert result.endswith(".mp4")
    
    def test_empty_filename_returns_default(self):
        assert sanitize_filename("") == "download"


class TestFileSizeValidation:
    def test_valid_size(self):
        validate_file_size(1024 * 1024)  # 1MB
    
    def test_exceeds_max_size(self):
        from core.config import settings
        with pytest.raises(SecurityError) as exc:
            validate_file_size(settings.max_file_size + 1)
        assert exc.value.code == "FILE_TOO_LARGE"


class TestPrivateIPDetection:
    def test_ipv4_private_ranges(self):
        assert is_private_ip(ipaddress.ip_address("10.0.0.1"))
        assert is_private_ip(ipaddress.ip_address("172.16.0.1"))
        assert is_private_ip(ipaddress.ip_address("192.168.1.1"))
        assert is_private_ip(ipaddress.ip_address("127.0.0.1"))
        assert is_private_ip(ipaddress.ip_address("169.254.1.1"))
    
    def test_ipv4_public_ranges(self):
        assert not is_private_ip(ipaddress.ip_address("8.8.8.8"))
        assert not is_private_ip(ipaddress.ip_address("1.1.1.1"))
        assert not is_private_ip(ipaddress.ip_address("203.0.113.1"))
    
    def test_ipv6_private_ranges(self):
        assert is_private_ip(ipaddress.ip_address("::1"))
        assert is_private_ip(ipaddress.ip_address("fc00::1"))
        assert is_private_ip(ipaddress.ip_address("fe80::1"))
    
    def test_ipv6_public_ranges(self):
        assert not is_private_ip(ipaddress.ip_address("2001:4860:4860::8888"))


class TestLocalhostDetection:
    def test_localhost_names(self):
        assert is_localhost("localhost")
        assert is_localhost("localhost.localdomain")
        assert is_localhost("127.0.0.1")
        assert is_localhost("::1")
        assert is_localhost("0.0.0.0")
        assert is_localhost("LOCALHOST")
    
    def test_non_localhost(self):
        assert not is_localhost("example.com")
        assert not is_localhost("8.8.8.8")


class TestFolderPathSanitization:
    def test_strips_double_quotes(self):
        # Simulates Windows 'Copy as path'
        raw = '"C:\\Users\\singh\\Downloads"'
        clean = sanitize_folder_path(raw)
        assert '"' not in clean
        assert clean.endswith("Downloads")

    def test_strips_single_quotes(self):
        raw = "'/home/user/downloads'"
        clean = sanitize_folder_path(raw)
        assert "'" not in clean

    def test_strips_whitespace(self):
        raw = "   C:\\Downloads   "
        clean = sanitize_folder_path(raw)
        assert clean.endswith("Downloads")

    def test_empty_path_raises(self):
        with pytest.raises(ValueError):
            sanitize_folder_path("")
        with pytest.raises(ValueError):
            sanitize_folder_path('""')