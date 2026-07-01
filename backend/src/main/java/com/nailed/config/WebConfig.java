package com.nailed.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${file.upload.path:./data/uploads}")
    private String uploadPath;

    @Value("${file.static.product.path:./data/images/products}")
    private String staticProductPath;

    @Value("${app.profile-image.upload-dir:./data/images/profileImg}")
    private String profileImagePath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadPath + "/");

//        registry.addResourceHandler("/images/products/**")
//                .addResourceLocations("file:" + staticProductPath + "/");

        registry.addResourceHandler("/images/products/**")
                .addResourceLocations("file:" + staticProductPath + "/",
                        "classpath:/static/images/products/");
        
//        registry.addResourceHandler("/images/profileImg/**")
//                .addResourceLocations("file:" + profileImagePath + "/");
//        
        registry.addResourceHandler("/images/profileImg/**")
        .addResourceLocations("file:" + profileImagePath + "/",
                                "classpath:/static/images/profileImg/");
    }
}