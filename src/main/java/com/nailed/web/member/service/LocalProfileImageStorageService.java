package com.nailed.web.member.service;

import com.nailed.common.exception.CustomException;
import com.nailed.common.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class LocalProfileImageStorageService implements ProfileImageStorageService {

    @Value("${app.profile-image.upload-dir}")
    private String uploadDir;

    @Value("${app.profile-image.base-url}")
    private String baseUrl;

    @Override
    public String store(MultipartFile file, String memberId) {
        String ext = getExtension(file.getOriginalFilename());
        String seq = memberId.replaceAll("[^0-9]", "");
        String filename = "MEMBER_" + memberId + "_PRI_" + Integer.parseInt(seq) + "." + ext;

        try {
            Path dir = Paths.get(uploadDir);
            Files.createDirectories(dir);

            // 기존 프로필 이미지 삭제 (jpg/png)
            Files.list(dir)
                .filter(p -> {
                    String name = p.getFileName().toString();
                    return name.startsWith("MEMBER_" + memberId + "_PRI_")
                        && (name.endsWith(".jpg") || name.endsWith(".png"));
                })
                .forEach(p -> {
                    try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                });

            file.transferTo(dir.resolve(filename));
        } catch (IOException e) {
            throw new CustomException(ErrorCode.FILE_UPLOAD_FAILED);
        }

        return baseUrl + "/" + filename;
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "jpg";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}