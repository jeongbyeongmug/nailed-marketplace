package com.nailed.web.member.service;

import org.springframework.web.multipart.MultipartFile;

public interface ProfileImageStorageService {
    String store(MultipartFile file, String memberId);
}
