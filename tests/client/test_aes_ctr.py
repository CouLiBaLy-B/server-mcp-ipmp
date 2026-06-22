from projeqtor_mcp_server.client.aes_ctr import encrypt_aes_ctr


def test_encrypt_aes_ctr_envelope_is_iv_and_ciphertext() -> None:
    encrypted = encrypt_aes_ctr('{"name":"x"}', "secret", 128)
    iv, ciphertext = encrypted.split(":")
    assert iv
    assert ciphertext
    assert encrypted != '{"name":"x"}'
