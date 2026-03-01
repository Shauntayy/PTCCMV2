package com.ptccm.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
    System.out.println("DB_URL present? " + (System.getenv("DB_URL") != null));
    System.out.println("DB_USERNAME present? " + (System.getenv("DB_USERNAME") != null));
    System.out.println("DB_PASSWORD present? " + (System.getenv("DB_PASSWORD") != null));
    SpringApplication.run(BackendApplication.class, args);
}

}
