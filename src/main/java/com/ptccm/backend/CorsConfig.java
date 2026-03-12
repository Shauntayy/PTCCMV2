package com.ptccm.backend;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Allow the frontend to call backend APIs with the custom user header.
        registry.addMapping("/**")
                .allowedOrigins(
                        "http://localhost:5173",
                        "https://ptccm-new.vercel.app",
                        "https://ptccm-v2-j7e9us4ev-shauntayys-projects.vercel.app"
                )
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type", "X-User-Id")
                .allowCredentials(true);
    }
}