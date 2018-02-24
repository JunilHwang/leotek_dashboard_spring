package leotek.dashboard.Controller;

import leotek.dashboard.Service.DashboardService;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.annotation.Resource;
import javax.servlet.http.HttpSession;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.List;

@Controller
public class HomeController {

    @Resource(name="dashboard")
    private DashboardService service;

    @Resource
    private SqlSession sqlSession;

    private String callUrl = "http://aws.airtumbler.co:9350/ATDataService";

    @RequestMapping(value={"/"})
    public String home(){
        return "index";
    }

    @RequestMapping(value="/getMember")
    @ResponseBody
    public HashMap getMember(HttpSession session){
        HashMap member = (HashMap)session.getAttribute("member");
        return member;
    }

    @RequestMapping(value="/getLogin")
    @ResponseBody
    public HashMap getLogin(@RequestParam HashMap params, HttpSession session){
        HashMap memberInfo = service.MemberGet(params);
        if(memberInfo != null){
            session.setAttribute("member",memberInfo);
        }
        return memberInfo;
    }

    @RequestMapping(value="/logout")
    @ResponseBody
    public String logout(HttpSession session){
        session.removeAttribute("member");
        return "true";
    }

    @RequestMapping(value="/getData")
    @ResponseBody
    public String getData(@RequestParam HashMap<String, String> params) throws IOException {
        String columns = "";
        String val;
        for( String key : params.keySet() ){
            val = params.get(key);
            if(key.equals("method") || key.equals("table")) continue;
            if(key.equals("pwd")) val = Base64.getEncoder().encodeToString(val.getBytes());
            columns += String.format("&%s=%s",key,val);
        }
        String url = String.format("%s/%s?%s",callUrl,params.get("table").toString(),columns.substring(1));
        String content = UrlGetContents(url);
        return content;
    }

    @RequestMapping(value="/getDevice")
    @ResponseBody
    public JSONArray getDevice(@RequestParam HashMap<String, String> params) throws IOException, ParseException {
        String  columns = "",
                val,url,content_string,color,device_info_string;
        JSONParser parser = new JSONParser();
        JSONObject content, data, device_info;
        JSONArray dataList, temp = new JSONArray();
        int score;
        for( String key : params.keySet() ){
            val = params.get(key);
            if(key.equals("method") || key.equals("table")) continue;
            if(key.equals("pwd")) val = Base64.getEncoder().encodeToString(val.getBytes());
            columns += String.format("&%s=%s",key,val);
        }
        url = String.format("%s/%s?%s",callUrl,params.get("table").toString(),columns.substring(1));
        content_string = UrlGetContents(url);
        content = (JSONObject) parser.parse(content_string);
        dataList = (JSONArray) content.get("Data");
        if(content.get("Data") != null) for(int i=0, len=dataList.size(); i<len; i++){
            data = (JSONObject) dataList.get(i);
            device_info_string = UrlGetContents(callUrl+"/GetRealMeterData?serialNo="+data.get("DVC_SRNO").toString());
            device_info = (JSONObject)parser.parse(device_info_string);
            score = 0;
            data.put("co2",0);
            data.put("dust",0);
            data.put("tvoc",0);
            data.put("temp",0);
            data.put("hum",0);
            color = "color4";
            if(device_info.get("Data") != null){
                JSONObject device_data = (JSONObject) device_info.get("Data");
                Double CIAQI = Double.parseDouble(device_data.get("CIAQI").toString());
                score = (int) Math.ceil((Math.floor(CIAQI)/450)*100);
                if(score <= 25){
                    color = "color4";
                } else if(score <= 50){
                    color = "color3";
                } else if(score <= 75){
                    color = "color2";
                } else if(score <= 100){
                    color = "color1";
                }
                data.replace("co2",device_data.get("CO2_IDX"));
                data.replace("dust",device_data.get("DUST_IDX"));
                data.replace("tvoc",device_data.get("TVOC_IDX"));
                data.replace("temp",device_data.get("TEMP"));
                data.replace("hum",device_data.get("HUM"));
            }
            data.put("color",color);
            data.put("score",score);
            temp.add(data);
        }
        return temp;
    }

    @RequestMapping(value="/getGraph")
    @ResponseBody
    public HashMap getGraph(@RequestParam HashMap params){
        Date date = new Date();
        SimpleDateFormat
                dateFormat1 = new SimpleDateFormat("yyyy-MM-dd"),
                dateFormat2 = new SimpleDateFormat("yyyy-MM-dd 23:59:59");
        String
                start = params.containsKey("start") ? params.get("start").toString() : dateFormat1.format(date),
                end = params.containsKey("end") ? params.get("end").toString() : dateFormat2.format(date),
                srno = params.containsKey("srno") ? params.get("srno").toString() : "LT-AT-SH-0046435";
        List data;
        HashMap point,
                json = new HashMap(),
                obj = new HashMap();
        obj.put("start",start);
        obj.put("end",end);
        obj.put("srno",srno);
        data = service.GraphDataGet(obj);
        point = service.GraphPointGet(obj);
        json.put("data",data);
        json.put("point",point);
        return json;
    }

    public static String fileGetContents(String filePath) {
        try {
            File file = new File(filePath);
            byte bt[] = new byte[(int)file.length()];
            FileInputStream fis = new FileInputStream(file);
            fis.read(bt);
            fis.close();
            return new String(bt, "UTF-8");
        }
        catch(FileNotFoundException e){
            System.out.print("error 1" + e.getMessage());
        }
        catch(IOException e){
            System.out.print("error 2" + e.getMessage());
        }
        catch(Exception e){
            System.out.print("error 3" + e.getMessage());
        }
        return "";
    }

    public String UrlGetContents(String urlString) throws IOException {
        URL url = new URL(urlString);

        // 문자열로 URL 표현
        //System.out.println("URL :" + url.toExternalForm());

        // HTTP Connection 구하기
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        // 요청 방식 설정 ( GET or POST or .. 별도로 설정하지않으면 GET 방식 )
        conn.setRequestMethod("GET");

        // 연결 타임아웃 설정
        conn.setConnectTimeout(30000); // 30초
        // 읽기 타임아웃 설정
        conn.setReadTimeout(30000); // 30초

        // 응답 내용(BODY) 구하기
        String json_body = "";
        try (InputStream in = conn.getInputStream();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            byte[] buf = new byte[1024 * 8];
            int length = 0;
            while ((length = in.read(buf)) != -1) {
                out.write(buf, 0, length);
            }
            json_body += new String(out.toByteArray(), "UTF-8");
        }

        // 접속 해제
        conn.disconnect();
        return json_body;
    }

    static public void main(String[] args){

    }
}
